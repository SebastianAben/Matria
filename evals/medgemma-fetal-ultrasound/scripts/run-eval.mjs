#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LABELS = ["normal", "benign", "malignant"];
const PREDICTION_COLUMNS = ["normal", "benign", "malignant", "uncertain", "invalid", "error"];
const MODEL = process.env.OLLAMA_MEDGEMMA_MODEL ?? "medgemma1.5:4b";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const REQUEST_TIMEOUT_MS = Number(process.env.EVAL_REQUEST_TIMEOUT_MS ?? 120_000);
const MAX_RETRIES = Number(process.env.EVAL_MAX_RETRIES ?? 1);
const FORMAT_MODE = process.env.EVAL_OLLAMA_FORMAT_MODE ?? "json_schema";
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "predictedLabel",
    "confidence",
    "rationale",
    "qualityLimitations",
    "clinicianReviewRequired"
  ],
  properties: {
    predictedLabel: {
      type: "string",
      enum: ["normal", "benign", "malignant", "uncertain"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    rationale: {
      type: "string"
    },
    qualityLimitations: {
      type: "array",
      items: { type: "string" }
    },
    clinicianReviewRequired: {
      type: "boolean",
      const: true
    }
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evalRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(evalRoot, "data", "eval-manifest.json");
const resultsDir = path.join(evalRoot, "results");
const resultsPath = path.join(resultsDir, "medgemma-1.5-4b-40-images.json");
const summaryPath = path.join(resultsDir, "summary.md");

async function main() {
  await mkdir(resultsDir, { recursive: true });
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await assertOllamaModel();

  const rows = [];
  for (const [index, record] of manifest.records.entries()) {
    console.log(`[${index + 1}/${manifest.records.length}] ${record.evalId} ${record.label}`);
    rows.push(await evaluateImage(record));
    await writeFile(resultsPath, `${JSON.stringify(buildResults(manifest, rows), null, 2)}\n`);
  }

  const results = buildResults(manifest, rows);
  const summary = renderSummary(results);
  await writeFile(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(summaryPath, summary);
  console.log(`Wrote results to ${resultsPath}`);
  console.log(`Wrote summary to ${summaryPath}`);
}

async function assertOllamaModel() {
  const response = await fetch(new URL("/api/tags", OLLAMA_BASE_URL), {
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Ollama tags request failed with ${response.status}.`);
  const body = await response.json();
  const models = (body.models ?? []).map((model) => model.name);
  if (!models.includes(MODEL)) {
    throw new Error(`Ollama model ${MODEL} not found. Available models: ${models.join(", ") || "none"}`);
  }
}

async function evaluateImage(record) {
  const absoluteImagePath = path.join(evalRoot, record.imagePath);
  const imageBase64 = (await readFile(absoluteImagePath)).toString("base64");
  const prompt = buildPrompt();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await requestOllama(prompt, imageBase64, preferredFormat());
      const latencyMs = Date.now() - startedAt;
      const body = await response.json().catch(() => ({}));
      const rawText = body.message?.content ?? body.response ?? "";
      if (!response.ok) {
        if (attempt === 0 && FORMAT_MODE === "json_schema" && response.status === 400) {
          const fallbackResponse = await requestOllama(prompt, imageBase64, "json");
          const fallbackLatencyMs = Date.now() - startedAt;
          const fallbackBody = await fallbackResponse.json().catch(() => ({}));
          const fallbackRawText = fallbackBody.message?.content ?? fallbackBody.response ?? "";
          if (fallbackResponse.ok) {
            const parsed = parseModelJson(fallbackRawText);
            if (parsed.valid) {
              return buildRow(record, {
                status: "parsed",
                attempt,
                latencyMs: fallbackLatencyMs,
                rawText: fallbackRawText,
                parsed: parsed.value,
                structuredOutputMode: "json_fallback"
              });
            }
          }
        }
        return buildRow(record, {
          status: "error",
          attempt,
          latencyMs,
          rawText,
          error: `HTTP ${response.status}`,
          structuredOutputMode: selectedFormatName(preferredFormat())
        });
      }

      const parsed = parseModelJson(rawText);
      if (parsed.valid) {
        return buildRow(record, {
          status: "parsed",
          attempt,
          latencyMs,
          rawText,
          parsed: parsed.value,
          structuredOutputMode: selectedFormatName(preferredFormat())
        });
      }

      if (attempt === MAX_RETRIES) {
        return buildRow(record, {
          status: "invalid_json",
          attempt,
          latencyMs,
          rawText,
          error: parsed.error,
          structuredOutputMode: selectedFormatName(preferredFormat())
        });
      }
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        return buildRow(record, {
          status: "error",
          attempt,
          latencyMs: Date.now() - startedAt,
          rawText: "",
          error: error instanceof Error ? error.message : String(error),
          structuredOutputMode: selectedFormatName(preferredFormat())
        });
      }
    }
  }

  return buildRow(record, {
    status: "error",
    attempt: MAX_RETRIES,
    latencyMs: 0,
    rawText: "",
    error: "Unreachable eval loop state.",
    structuredOutputMode: selectedFormatName(preferredFormat())
  });
}

async function requestOllama(prompt, imageBase64, format) {
  return fetch(new URL("/api/chat", OLLAMA_BASE_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format,
      messages: [
        {
          role: "user",
          content: prompt,
          images: [imageBase64]
        }
      ]
    })
  });
}

function preferredFormat() {
  return FORMAT_MODE === "json_schema" ? RESPONSE_SCHEMA : "json";
}

function selectedFormatName(format) {
  return typeof format === "string" ? format : "json_schema";
}

function buildPrompt() {
  return [
    "You are evaluating a fetal ultrasound image for an engineering benchmark of Matria.",
    "Classify the image into exactly one predictedLabel: normal, benign, malignant, or uncertain.",
    "Return only JSON with keys: predictedLabel, confidence, rationale, qualityLimitations, clinicianReviewRequired.",
    "confidence must be a number from 0 to 1.",
    "qualityLimitations must be an array of strings.",
    "clinicianReviewRequired must be true.",
    "This is evaluation evidence only. Do not diagnose, prescribe, or make final triage decisions."
  ].join("\n");
}

function parseModelJson(rawText) {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    const predictedLabel = normalizePrediction(parsed.predictedLabel);
    const confidence = Number(parsed.confidence);
    if (!predictedLabel) throw new Error(`Invalid predictedLabel: ${parsed.predictedLabel}`);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error(`Invalid confidence: ${parsed.confidence}`);
    }
    if (parsed.clinicianReviewRequired !== true) {
      throw new Error("clinicianReviewRequired must be true.");
    }
    return {
      valid: true,
      value: {
        predictedLabel,
        confidence,
        rationale: String(parsed.rationale ?? ""),
        qualityLimitations: Array.isArray(parsed.qualityLimitations)
          ? parsed.qualityLimitations.map(String)
          : [],
        clinicianReviewRequired: true
      }
    };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function extractJson(rawText) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function normalizePrediction(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if ([...LABELS, "uncertain"].includes(normalized)) return normalized;
  return null;
}

function buildRow(record, output) {
  const predictedLabel = output.parsed?.predictedLabel ?? (output.status === "error" ? "error" : "invalid");
  return {
    evalId: record.evalId,
    imagePath: record.imagePath,
    expectedLabel: record.label,
    predictedLabel,
    correct: LABELS.includes(predictedLabel) && predictedLabel === record.label,
    status: output.status,
    attempt: output.attempt,
    latencyMs: output.latencyMs,
    confidence: output.parsed?.confidence ?? null,
    clinicianReviewRequired: output.parsed?.clinicianReviewRequired ?? false,
    structuredOutputMode: output.structuredOutputMode ?? "unknown",
    rationale: output.parsed?.rationale ?? "",
    qualityLimitations: output.parsed?.qualityLimitations ?? [],
    rawText: output.rawText,
    error: output.error ?? null
  };
}

function buildResults(manifest, rows) {
  return {
    evalName: "medgemma-1.5-4b-fetal-ultrasound-40",
    runAt: new Date().toISOString(),
    dataset: manifest.dataset,
    model: { displayName: "MedGemma 1.5 4B", ollamaTag: MODEL, ollamaBaseUrl: OLLAMA_BASE_URL },
    promptContract: {
      predictedLabels: [...LABELS, "uncertain"],
      structuredOutput: FORMAT_MODE === "json_schema" ? "ollama_json_schema" : "ollama_json_mode",
      responseSchema: RESPONSE_SCHEMA,
      clinicianReviewRequired: true,
      standaloneClinicalValidation: false
    },
    manifest: {
      seed: manifest.seed,
      totalImages: manifest.totalImages,
      targetCounts: manifest.targetCounts
    },
    metrics: computeMetrics(rows),
    rows
  };
}

function computeMetrics(rows) {
  const total = rows.length;
  const parsedRows = rows.filter((row) => row.status === "parsed");
  const validLabelRows = parsedRows.filter((row) => LABELS.includes(row.predictedLabel));
  const correct = rows.filter((row) => row.correct).length;
  const confusionMatrix = {};
  for (const label of LABELS) {
    confusionMatrix[label] = Object.fromEntries(PREDICTION_COLUMNS.map((column) => [column, 0]));
  }
  for (const row of rows) {
    const column = PREDICTION_COLUMNS.includes(row.predictedLabel) ? row.predictedLabel : "invalid";
    confusionMatrix[row.expectedLabel][column] += 1;
  }

  const perClass = {};
  for (const label of LABELS) {
    const tp = rows.filter((row) => row.expectedLabel === label && row.predictedLabel === label).length;
    const fp = rows.filter((row) => row.expectedLabel !== label && row.predictedLabel === label).length;
    const fn = rows.filter((row) => row.expectedLabel === label && row.predictedLabel !== label).length;
    const support = rows.filter((row) => row.expectedLabel === label).length;
    const precision = safeDivide(tp, tp + fp);
    const recall = safeDivide(tp, tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    perClass[label] = { precision, recall, f1, support };
  }

  const macroF1 = average(LABELS.map((label) => perClass[label].f1));
  const weightedF1 = safeDivide(
    LABELS.reduce((sum, label) => sum + perClass[label].f1 * perClass[label].support, 0),
    total
  );
  const balancedAccuracy = average(LABELS.map((label) => perClass[label].recall));
  const latencies = rows.map((row) => row.latencyMs).filter((latency) => Number.isFinite(latency) && latency > 0);

  return {
    totalImages: total,
    parsedResponses: parsedRows.length,
    validJsonRate: safeDivide(parsedRows.length, total),
    accuracy: safeDivide(correct, total),
    accuracyOnValidClassPredictions: safeDivide(
      validLabelRows.filter((row) => row.correct).length,
      validLabelRows.length
    ),
    balancedAccuracy,
    macroF1,
    weightedF1,
    perClass,
    confusionMatrix,
    uncertainCount: rows.filter((row) => row.predictedLabel === "uncertain").length,
    invalidJsonCount: rows.filter((row) => row.status === "invalid_json").length,
    errorCount: rows.filter((row) => row.status === "error").length,
    clinicianReviewRequiredCompliance: safeDivide(
      rows.filter((row) => row.clinicianReviewRequired === true).length,
      total
    ),
    latencyMs: {
      median: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      min: latencies.length ? Math.min(...latencies) : 0,
      max: latencies.length ? Math.max(...latencies) : 0
    }
  };
}

function renderSummary(results) {
  const metrics = results.metrics;
  const classRows = LABELS.map((label) => {
    const item = metrics.perClass[label];
    return `| ${label} | ${formatNumber(item.precision)} | ${formatNumber(item.recall)} | ${formatNumber(item.f1)} | ${item.support} |`;
  }).join("\n");
  const confusionRows = LABELS.map((label) => {
    const row = metrics.confusionMatrix[label];
    return `| ${label} | ${row.normal} | ${row.benign} | ${row.malignant} | ${row.uncertain} | ${row.invalid} | ${row.error} |`;
  }).join("\n");

  return `# MedGemma 1.5 4B Fetal Ultrasound Eval Summary

Generated: ${results.runAt}

This is an engineering/prototype evaluation for Matria's review-required medical evidence path. It is not clinical validation and must not be used as standalone diagnostic evidence.

## Run Configuration

| Field | Value |
| --- | --- |
| Dataset | Mendeley yrzzw9m6kk.2 |
| DOI | 10.17632/yrzzw9m6kk.2 |
| License | CC BY 4.0 |
| Model | ${results.model.displayName} |
| Ollama tag | ${results.model.ollamaTag} |
| Ollama base URL | ${results.model.ollamaBaseUrl} |
| Images | ${metrics.totalImages} |
| Seed | ${results.manifest.seed} |

## Metrics

| Metric | Value |
| --- | ---: |
| Accuracy | ${formatPercent(metrics.accuracy)} |
| Accuracy on valid class predictions | ${formatPercent(metrics.accuracyOnValidClassPredictions)} |
| Balanced accuracy | ${formatPercent(metrics.balancedAccuracy)} |
| Macro F1 | ${formatNumber(metrics.macroF1)} |
| Weighted F1 | ${formatNumber(metrics.weightedF1)} |
| Valid JSON rate | ${formatPercent(metrics.validJsonRate)} |
| Clinician-review flag compliance | ${formatPercent(metrics.clinicianReviewRequiredCompliance)} |
| Uncertain predictions | ${metrics.uncertainCount} |
| Invalid JSON responses | ${metrics.invalidJsonCount} |
| Request errors | ${metrics.errorCount} |
| Median latency | ${Math.round(metrics.latencyMs.median)} ms |
| p95 latency | ${Math.round(metrics.latencyMs.p95)} ms |

## Per-Class Metrics

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
${classRows}

## Confusion Matrix

| Actual label | Pred normal | Pred benign | Pred malignant | Pred uncertain | Invalid JSON | Error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${confusionRows}
`;
}

function safeDivide(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
  return sorted[index];
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  return value.toFixed(3);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
