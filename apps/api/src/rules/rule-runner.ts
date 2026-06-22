import {
  ruleActionTypes,
  ruleBlockingLevels,
  ruleSeverities,
  type RuleActionType,
  type RuleBlockingLevel,
  type RuleSeverity
} from "@matria/shared";
import type { PregnancyEpisode, SessionNote, StructuredObservation } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const ruleDefinitionSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  family: z.string().min(1),
  condition: z.string().min(1),
  severity: z.enum(ruleSeverities),
  blockingLevel: z.enum(ruleBlockingLevels),
  actionType: z.enum(ruleActionTypes),
  suggestedAction: z.string().min(1),
  thresholdDescription: z.string().min(1),
  needsLocalGuidelineValidation: z.boolean()
});

export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;

export type RuleSourceReference = {
  type: string;
  id?: string;
  label?: string;
};

export type RuleRunnerContext = {
  pregnancyEpisode: PregnancyEpisode;
  observations: StructuredObservation[];
  sessionNote: SessionNote | null;
  transcriptCandidateTexts?: Array<{ id: string; text: string }>;
};

export type RuleRunnerResult = {
  ruleId: string;
  ruleVersion: string;
  severity: RuleSeverity;
  blockingLevel: RuleBlockingLevel;
  actionType: RuleActionType;
  evidence: Record<string, unknown>;
  sourceReferences: RuleSourceReference[];
  confidence: number;
  suggestedAction: string;
  thresholdDescription: string;
  needsLocalGuidelineValidation: boolean;
};

const definitionsPath = join(dirname(fileURLToPath(import.meta.url)), "rule-definitions.json");

export function loadRuleDefinitions(): RuleDefinition[] {
  const parsed = JSON.parse(readFileSync(definitionsPath, "utf8")) as unknown;
  return z.array(ruleDefinitionSchema).parse(parsed);
}

export function evaluateRules(context: RuleRunnerContext): RuleRunnerResult[] {
  return loadRuleDefinitions().flatMap((definition) => {
    const result = evaluateDefinition(definition, context);
    return result ? [result] : [];
  });
}

function evaluateDefinition(
  definition: RuleDefinition,
  context: RuleRunnerContext
): RuleRunnerResult | null {
  const match = conditionEvaluators[definition.condition]?.(context);
  if (!match) return null;
  return {
    ruleId: definition.id,
    ruleVersion: definition.version,
    severity: definition.severity,
    blockingLevel: definition.blockingLevel,
    actionType: definition.actionType,
    evidence: match.evidence,
    sourceReferences: match.sourceReferences,
    confidence: match.confidence,
    suggestedAction: definition.suggestedAction,
    thresholdDescription: definition.thresholdDescription,
    needsLocalGuidelineValidation: definition.needsLocalGuidelineValidation
  };
}

type ConditionMatch = {
  evidence: Record<string, unknown>;
  sourceReferences: RuleSourceReference[];
  confidence: number;
};

type ConditionEvaluator = (context: RuleRunnerContext) => ConditionMatch | null;

const conditionEvaluators: Record<string, ConditionEvaluator> = {
  severe_hypertension: evaluateSevereHypertension,
  keyword_bleeding: (context) =>
    evaluateKeywordText(context, ["bleeding", "blood loss", "vaginal bleed"]),
  keyword_reduced_fetal_movement: (context) =>
    evaluateKeywordText(context, [
      "reduced fetal movement",
      "less fetal movement",
      "baby not moving",
      "decreased fetal movement"
    ]),
  anemia_indicator: evaluateAnemia,
  fever_indicator: evaluateFever,
  abnormal_urine_indicator: evaluateAbnormalUrine,
  missing_gestational_age: evaluateMissingGestationalAge,
  gestational_age_inconsistency: evaluateGestationalAgeInconsistency,
  basic_note_contradiction: evaluateBasicNoteContradiction
};

function evaluateSevereHypertension(context: RuleRunnerContext): ConditionMatch | null {
  for (const observation of context.observations.filter((item) => item.type === "vitals")) {
    const systolic = firstNumber(observation.value, [
      "systolic",
      "systolicBp",
      "systolicBloodPressure",
      "bpSystolic"
    ]);
    const diastolic = firstNumber(observation.value, [
      "diastolic",
      "diastolicBp",
      "diastolicBloodPressure",
      "bpDiastolic"
    ]);
    const parsed = parseBloodPressure(observation.value);
    const finalSystolic = systolic ?? parsed?.systolic;
    const finalDiastolic = diastolic ?? parsed?.diastolic;
    if ((finalSystolic ?? 0) >= 160 || (finalDiastolic ?? 0) >= 110) {
      return {
        evidence: { systolic: finalSystolic, diastolic: finalDiastolic },
        sourceReferences: [{ type: "structured_observation", id: observation.id, label: "Vitals" }],
        confidence: 0.95
      };
    }
  }
  return null;
}

function evaluateAnemia(context: RuleRunnerContext): ConditionMatch | null {
  for (const observation of context.observations.filter((item) => item.type === "labs")) {
    const hemoglobin = firstNumber(observation.value, ["hemoglobin", "hb", "hgb"]);
    if (hemoglobin !== undefined && hemoglobin < 11) {
      return {
        evidence: { hemoglobin },
        sourceReferences: [{ type: "structured_observation", id: observation.id, label: "Labs" }],
        confidence: 0.9
      };
    }
  }
  return null;
}

function evaluateFever(context: RuleRunnerContext): ConditionMatch | null {
  for (const observation of context.observations.filter((item) => item.type === "vitals")) {
    const temperature = firstNumber(observation.value, ["temperatureC", "temperature", "tempC"]);
    if (temperature !== undefined && temperature >= 38) {
      return {
        evidence: { temperatureC: temperature },
        sourceReferences: [{ type: "structured_observation", id: observation.id, label: "Vitals" }],
        confidence: 0.9
      };
    }
  }
  return evaluateKeywordText(context, ["fever", "febrile", "high temperature"]);
}

function evaluateAbnormalUrine(context: RuleRunnerContext): ConditionMatch | null {
  for (const observation of context.observations.filter((item) => item.type === "labs")) {
    const protein = firstString(observation.value, ["urineProtein", "protein", "proteinuria"]);
    const glucose = firstString(observation.value, ["urineGlucose", "glucose", "glucosuria"]);
    const abnormalValue = [protein, glucose].find((value) => value && isPositiveUrineValue(value));
    if (abnormalValue) {
      return {
        evidence: { urineProtein: protein, urineGlucose: glucose },
        sourceReferences: [
          { type: "structured_observation", id: observation.id, label: "Urine labs" }
        ],
        confidence: 0.85
      };
    }
  }
  return null;
}

function evaluateMissingGestationalAge(context: RuleRunnerContext): ConditionMatch | null {
  if (context.pregnancyEpisode.gestationalAgeWeeks !== null) return null;
  const observationWeeks = getGestationalAgeObservations(context);
  if (observationWeeks.length > 0) return null;
  return {
    evidence: { pregnancyEpisodeGestationalAgeWeeks: null },
    sourceReferences: [{ type: "pregnancy_episode", id: context.pregnancyEpisode.id }],
    confidence: 1
  };
}

function evaluateGestationalAgeInconsistency(context: RuleRunnerContext): ConditionMatch | null {
  const episodeWeeks = context.pregnancyEpisode.gestationalAgeWeeks;
  if (episodeWeeks === null) return null;
  const observationWeeks = getGestationalAgeObservations(context);
  const inconsistent = observationWeeks.find((item) => Math.abs(item.weeks - episodeWeeks) > 2);
  if (!inconsistent) return null;
  return {
    evidence: { pregnancyEpisodeWeeks: episodeWeeks, observationWeeks: inconsistent.weeks },
    sourceReferences: [
      { type: "pregnancy_episode", id: context.pregnancyEpisode.id },
      { type: "structured_observation", id: inconsistent.id, label: "Gestational age" }
    ],
    confidence: 0.9
  };
}

function evaluateBasicNoteContradiction(context: RuleRunnerContext): ConditionMatch | null {
  const text = context.sessionNote?.content.toLowerCase() ?? "";
  const contradictions = [
    ["no bleeding", "bleeding"],
    ["denies fever", "fever"],
    ["no headache", "headache"]
  ];
  const matched = contradictions.find(
    ([negative, positive]) => text.includes(negative ?? "") && text.includes(positive ?? "")
  );
  if (!matched || text.trim().length === 0) return null;
  return {
    evidence: { negativePhrase: matched[0], positivePhrase: matched[1] },
    sourceReferences: context.sessionNote
      ? [{ type: "session_note", id: context.sessionNote.id, label: "Session note" }]
      : [],
    confidence: 0.6
  };
}

function evaluateKeywordText(
  context: RuleRunnerContext,
  keywords: string[]
): ConditionMatch | null {
  const texts = [
    ...(context.sessionNote?.content
      ? [{ type: "session_note", id: context.sessionNote.id, text: context.sessionNote.content }]
      : []),
    ...(context.transcriptCandidateTexts ?? []).map((candidate) => ({
      type: "transcript_candidate",
      id: candidate.id,
      text: candidate.text
    }))
  ];
  for (const item of texts) {
    const lower = item.text.toLowerCase();
    const keyword = keywords.find((value) => lower.includes(value));
    if (keyword) {
      return {
        evidence: { keyword, textSnippet: item.text.slice(0, 240) },
        sourceReferences: [{ type: item.type, id: item.id }],
        confidence: item.type === "session_note" ? 0.8 : 0.65
      };
    }
  }
  return null;
}

function getGestationalAgeObservations(context: RuleRunnerContext) {
  return context.observations
    .filter((item) => item.type === "gestational_age")
    .map((item) => ({
      id: item.id,
      weeks: firstNumber(item.value, ["weeks", "gestationalAgeWeeks"])
    }))
    .filter((item): item is { id: string; weeks: number } => item.weeks !== undefined);
}

function firstNumber(value: unknown, keys: string[]): number | undefined {
  if (!isRecord(value)) return undefined;
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
      return Number(raw);
    }
  }
  return undefined;
}

function firstString(value: unknown, keys: string[]): string | undefined {
  if (!isRecord(value)) return undefined;
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === "string" && raw.trim() !== "") return raw.toLowerCase();
  }
  return undefined;
}

function parseBloodPressure(value: unknown): { systolic: number; diastolic: number } | undefined {
  if (!isRecord(value)) return undefined;
  const raw = value.bloodPressure ?? value.bp;
  if (typeof raw !== "string") return undefined;
  const match = raw.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return undefined;
  return { systolic: Number(match[1]), diastolic: Number(match[2]) };
}

function isPositiveUrineValue(value: string) {
  return ["positive", "trace", "1+", "2+", "3+", "4+"].includes(value.toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
