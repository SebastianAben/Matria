# 06-LUS Mid-Consultation Demo Script

## Presenter Setup

1. Open `http://localhost:3000/demo/06-lus`.
2. Explain that this is already mid-consultation. The patient context, consent, ambient session, vitals, earlier transcript, summary draft, rules, highlights, and recommendations are already present.
3. Point out patient 06 baseline from `DB_demografia.csv`: GA 20w0d, age 39, weight 69 kg, height 168 cm, BMI 24.4, parity 0, prior cesarean 0, contractions 0, and urine result missing.
4. Click `Start demo`.
5. Narrate that the video jumps to 09:00, plays at 2x, and the clinical workspace updates from a curated mock transcript synchronized to the consultation dialogue.
6. At the end, show that the workspace pauses mid-consultation: the working draft remains visible, urine/protein is still open, and the button returns as `Restart demo`.

## Clinician and Patient Dialogue

The dialogue is approximately 42 seconds, in English, and represents the middle of an ANC consultation.

| Time | Speaker | Dialogue |
| --- | --- | --- |
| 0-8s | Presenter | The video starts and baseline mid-consultation data stays on screen. No new live transcript appears yet. |
| 8-11s | Clinician | "Let me confirm again: have you started feeling the baby's movements today?" |
| 11-15s | Patient | "Yes, doctor. I have felt a few gentle movements, especially when I am resting." |
| 16-18s | Clinician | "Have you had any bleeding, fluid leakage, or tightening in your abdomen like contractions?" |
| 18-21s | Patient | "No bleeding, no fluid leakage, and no contractions." |
| 24-27s | Clinician | "Because you are thirty-nine and this is your first pregnancy, we will keep monitoring a little more carefully." |
| 28-32s | Clinician | "Today's urine result is not back yet, so we will complete the urine protein check before you go home." |
| 32-35s | Patient | "Okay, doctor. I will wait for the result before going home." |
| 35-40s | Clinician | "If you have bleeding, leaking fluid, severe pain, fever, or reduced fetal movement, please come back immediately." |

## Timeline Mapping

| Demo time | Transcript / cue | Visible UI change | Clinical reasoning |
| --- | --- | --- | --- |
| 0s | Presenter clicks `Start demo`. | Button disappears, status changes to running, video seeks to 09:00 at 2x. | The demo begins from an active ambient session, not a new encounter. |
| 0-8s | Opening delay. | Existing transcript, rules, summary, and recommendations remain visible; no new live turn appears. | The audience can read the baseline mid-consultation state before new intelligence arrives. |
| 8-15s | Fetal movement is asked and confirmed. | New transcript turns appear; `Fetal movement present` highlight is added. | Fetal movement is a reassuring symptom context, but it is not treated as a diagnosis. |
| 16-23s | Patient denies bleeding, fluid leakage, and contractions. | Rule panel adds resolved contraction warning screen; warning-sign recommendation remains in progress; summary updates. | The deterministic rule captures explicit denial of contractions while continuing the broader warning-sign screen. |
| 24-27s | Clinician confirms age 39 and first pregnancy context. | Advanced maternal age highlight links to current encounter context. | Age 39 is maintained as a watch item and source-linked to the current encounter. |
| 28-32s | Urine/protein result is discussed as not yet available. | Urine recommendation escalates from medium to high priority. | Missing urine/protein remains the main actionable open item before discharge. |
| 32-37s | Patient acknowledges waiting for urine result; clinician gives warning-sign counseling. | Warning-sign recommendation becomes done and counseling is documented. | The system recognizes counseling coverage only after the clinician states return precautions. |
| 40-42s | Working summary refresh. | Session note and progressive summary update as a live working draft. | The draft reflects fetal movement present, warning signs denied, counseling covered, and urine/protein still open. The visit plan is still being built. |
| 42s | Demo pauses. | Video pauses, active mid-consultation state remains visible, `Restart demo` appears. | Presenter can rerun the same deterministic sequence without implying the consultation is finished. |

## Closing Narration

"This page is intentionally isolated from the normal clinical workspace. The regular app remains backend-driven and fixture-free, while this route demonstrates the intended mid-consultation behavior with synchronized mock transcription, highlights, deterministic rules, recommendations, and a live working summary. The segment pauses while the visit is still active."
