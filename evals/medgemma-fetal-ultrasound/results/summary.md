# MedGemma 1.5 4B Fetal Ultrasound Eval Summary

Generated: 2026-06-25T06:15:27.872Z

This is an engineering/prototype evaluation for Matria's review-required medical evidence path. It is not clinical validation and must not be used as standalone diagnostic evidence.

## Run Configuration

| Field | Value |
| --- | --- |
| Dataset | Mendeley yrzzw9m6kk.2 |
| DOI | 10.17632/yrzzw9m6kk.2 |
| License | CC BY 4.0 |
| Model | MedGemma 1.5 4B |
| Ollama tag | medgemma1.5:4b |
| Ollama base URL | http://host.docker.internal:11434 |
| Images | 40 |
| Seed | matria-medgemma-1.5-4b-eval-40 |

## Metrics

| Metric | Value |
| --- | ---: |
| Accuracy | 32.5% |
| Accuracy on valid class predictions | 37.1% |
| Balanced accuracy | 31.0% |
| Macro F1 | 0.177 |
| Weighted F1 | 0.186 |
| Valid JSON rate | 100.0% |
| Clinician-review flag compliance | 100.0% |
| Uncertain predictions | 5 |
| Invalid JSON responses | 0 |
| Request errors | 0 |
| Median latency | 4647 ms |
| p95 latency | 5088 ms |

## Per-Class Metrics

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| normal | 0.371 | 0.929 | 0.531 | 14 |
| benign | 0.000 | 0.000 | 0.000 | 13 |
| malignant | 0.000 | 0.000 | 0.000 | 13 |

## Confusion Matrix

| Actual label | Pred normal | Pred benign | Pred malignant | Pred uncertain | Invalid JSON | Error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| normal | 13 | 0 | 0 | 1 | 0 | 0 |
| benign | 11 | 0 | 0 | 2 | 0 | 0 |
| malignant | 11 | 0 | 0 | 2 | 0 | 0 |
