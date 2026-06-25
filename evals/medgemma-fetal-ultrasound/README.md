# MedGemma 1.5 4B Fetal Ultrasound Evaluation

This folder contains reproducible instructions and scripts for evaluating `MedGemma 1.5 4B` through Ollama on 40 images from the Mendeley fetal ultrasound image dataset.

This is an engineering evaluation for Matria's review-required medical evidence workflow. It is not clinical validation and must not be used as standalone diagnostic evidence.

## Dataset

| Field | Value |
| --- | --- |
| Dataset | Ultrasound Fetus Dataset |
| Mendeley ID | `yrzzw9m6kk.2` |
| DOI | `10.17632/yrzzw9m6kk.2` |
| URL | https://data.mendeley.com/datasets/yrzzw9m6kk/2 |
| License | CC BY 4.0 |
| Classes | `normal`, `benign`, `malignant` |
| Eval size | 40 images |
| Eval split | 14 normal, 13 benign, 13 malignant |
| Stable seed | `matria-medgemma-1.5-4b-eval-40` |

Raw downloaded data is stored under `.data/raw/` and ignored by Git. The deterministic 40-image eval subset is copied into `data/eval-images/`, with metadata in `data/eval-manifest.json`.

## Prerequisites

1. Start Ollama on the Mac host.
2. Install or pull the model:

```sh
ollama pull medgemma1.5:4b
```

3. Confirm the model is available:

```sh
ollama list | grep 'medgemma1.5:4b'
```

4. Confirm `bsdtar` is available for the nested `Datasets.rar` archive inside the Mendeley ZIP:

```sh
command -v bsdtar
```

5. Confirm Docker can reach Mac Ollama:

```sh
docker run --rm \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  node:22-bookworm \
  node -e "fetch(process.env.OLLAMA_BASE_URL + '/api/tags').then(r => r.json()).then(console.log)"
```

## Download and Prepare the Dataset

From the repo root:

```sh
node evals/medgemma-fetal-ultrasound/scripts/download-dataset.mjs
node evals/medgemma-fetal-ultrasound/scripts/prepare-eval-dataset.mjs
```

If automated download fails, manually download the dataset ZIP from https://data.mendeley.com/datasets/yrzzw9m6kk/2, place it at:

```txt
evals/medgemma-fetal-ultrasound/.data/raw/yrzzw9m6kk-2.zip
```

Then rerun:

```sh
node evals/medgemma-fetal-ultrasound/scripts/prepare-eval-dataset.mjs
```

Verify the prepared subset:

```sh
node evals/medgemma-fetal-ultrasound/scripts/prepare-eval-dataset.mjs --check
```

## Run the Evaluation from Docker

From the repo root:

```sh
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -e OLLAMA_MEDGEMMA_MODEL=medgemma1.5:4b \
  -e EVAL_OLLAMA_FORMAT_MODE=json_schema \
  -v "$PWD":/app \
  -w /app \
  node:22-bookworm \
  sh -lc "node evals/medgemma-fetal-ultrasound/scripts/run-eval.mjs"
```

On Docker Desktop for Mac, `host.docker.internal` should resolve to the Mac host. If Docker Desktop rejects `--add-host=host.docker.internal:host-gateway`, remove that line and rerun the command.

## Run the Evaluation Without Docker

```sh
OLLAMA_BASE_URL=http://127.0.0.1:11434 \
OLLAMA_MEDGEMMA_MODEL=medgemma1.5:4b \
EVAL_OLLAMA_FORMAT_MODE=json_schema \
node evals/medgemma-fetal-ultrasound/scripts/run-eval.mjs
```

## Outputs

The eval writes:

```txt
evals/medgemma-fetal-ultrasound/results/medgemma-1.5-4b-40-images.json
evals/medgemma-fetal-ultrasound/results/summary.md
```

The JSON file contains raw model responses and parsed rows. The Markdown summary contains computed metrics.

## Metrics

The eval computes:

- Accuracy.
- Accuracy on valid class predictions.
- Balanced accuracy.
- Macro F1.
- Weighted F1.
- Per-class precision, recall, F1, and support.
- Confusion matrix.
- Valid JSON rate.
- Uncertain prediction count.
- Invalid JSON response count.
- Request error count.
- Clinician-review flag compliance.
- Median, min, max, and p95 latency.

## Prompt Contract

Each image is sent with Ollama structured output enabled. By default, `EVAL_OLLAMA_FORMAT_MODE=json_schema` sends a JSON Schema object in the Ollama `format` field. If the local Ollama version rejects schema mode, the script falls back to Ollama JSON mode and still validates the response locally before scoring.

The required schema is:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "predictedLabel",
    "confidence",
    "rationale",
    "qualityLimitations",
    "clinicianReviewRequired"
  ],
  "properties": {
    "predictedLabel": {
      "type": "string",
      "enum": ["normal", "benign", "malignant", "uncertain"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "rationale": {
      "type": "string"
    },
    "qualityLimitations": {
      "type": "array",
      "items": { "type": "string" }
    },
    "clinicianReviewRequired": {
      "type": "boolean",
      "const": true
    }
  }
}
```

`clinicianReviewRequired` must be `true` for every valid response.
