export type DemoTone = "green" | "amber" | "red" | "blue" | "gray";

export type DemoTranscriptTurn = {
  at: string;
  speaker: string;
  role: string;
  text: string;
  confidence: string;
  status: string;
};

export type DemoObservation = {
  type: string;
  value: string;
  source: string;
  status: string;
};

export type DemoRule = {
  rule: string;
  severity: string;
  blocking: string;
  evidence: string;
  status: string;
};

export type DemoHighlight = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  confidence: string;
  tone: DemoTone;
};

export type DemoRecommendation = {
  id: string;
  title: string;
  rationale: string;
  priority: string;
  status: string;
  result: string;
  tone: DemoTone;
};

export type DemoEvent =
  | {
      at: number;
      kind: "transcript";
      turn: DemoTranscriptTurn;
    }
  | {
      at: number;
      kind: "observation";
      observation: DemoObservation;
    }
  | {
      at: number;
      kind: "rule";
      rule: DemoRule;
    }
  | {
      at: number;
      kind: "highlight";
      highlight: DemoHighlight;
    }
  | {
      at: number;
      kind: "recommendation";
      recommendation: DemoRecommendation;
    }
  | {
      at: number;
      kind: "summary";
      summary: string;
    }
  | {
      at: number;
      kind: "note";
      note: string;
    };

export const demoPatient06 = {
  id: "demo-patient-06",
  hospitalNumber: "DEMO-06-LUS",
  fullName: "Ms. Lestari Usman",
  dateOfBirth: "1987-04-18",
  phone: "08xx xxxx 0606",
  address: "Address hidden for demo"
};

export const demoPregnancy06 = {
  id: "demo-pregnancy-06",
  patientId: demoPatient06.id,
  label: "Pregnancy 01",
  estimatedDueDate: "2026-11-09",
  gestationalAgeWeeks: 20,
  status: "active",
  createdAt: "2026-06-22T08:30:00.000Z",
  updatedAt: "2026-06-22T08:30:00.000Z"
};

export const demoEncounter06 = {
  id: "demo-encounter-06",
  patientId: demoPatient06.id,
  pregnancyEpisodeId: demoPregnancy06.id,
  status: "active" as const,
  visitType: "routine_anc",
  facilityName: "LUS ANC Clinic",
  createdAt: "2026-06-22T09:05:00.000Z",
  updatedAt: "2026-06-22T09:21:00.000Z"
};

export const baselineTranscript: DemoTranscriptTurn[] = [
  {
    at: "09:14",
    speaker: "Clinician",
    role: "clinician",
    text: "Your blood pressure was good earlier, 112 over 72. Let us continue by checking fetal movement and today's symptoms.",
    confidence: "0.96",
    status: "Earlier"
  },
  {
    at: "09:15",
    speaker: "Patient",
    role: "patient",
    text: "Alright, doctor. So far I feel calmer, although I still get tired sometimes.",
    confidence: "0.93",
    status: "Earlier"
  },
  {
    at: "09:16",
    speaker: "Clinician",
    role: "clinician",
    text: "Today's ultrasound places the pregnancy at twenty weeks, and this is your first pregnancy.",
    confidence: "0.95",
    status: "Earlier"
  }
];

export const baselineObservations: DemoObservation[] = [
  { type: "vitals", value: "BP 112/72 mmHg, HR 84 bpm", source: "clinician_entered", status: "verified" },
  { type: "gestational_age", value: "20w0d by ultrasound", source: "scan context", status: "verified" },
  { type: "history", value: "G1P0, no prior cesarean", source: "intake", status: "verified" },
  { type: "anthropometry", value: "69 kg, 168 cm, BMI 24.4", source: "CSV patient 06", status: "verified" },
  { type: "symptoms", value: "No contractions reported before current segment", source: "earlier interview", status: "draft" }
];

export const baselineRules: DemoRule[] = [
  {
    rule: "Advanced maternal age",
    severity: "watch",
    blocking: "none",
    evidence: "Age 39 years from patient 06 CSV",
    status: "active"
  },
  {
    rule: "Urine result missing",
    severity: "warning",
    blocking: "soft",
    evidence: "Urine field blank in patient 06 CSV",
    status: "active"
  }
];

export const baselineHighlights: DemoHighlight[] = [
  {
    id: "age",
    type: "risk",
    title: "Advanced maternal age",
    body: "Age 39; continue routine ANC risk review without implying diagnosis.",
    severity: "Watch",
    confidence: "0.99",
    tone: "amber"
  },
  {
    id: "urine",
    type: "missing_context",
    title: "Urine/protein result missing",
    body: "Urine result is not recorded; confirm dipstick or document why unavailable.",
    severity: "Medium",
    confidence: "0.92",
    tone: "amber"
  },
  {
    id: "baseline",
    type: "memory",
    title: "Stable baseline vitals",
    body: "BP and heart rate entered earlier in the visit; no current emergency signal.",
    severity: "Low",
    confidence: "0.88",
    tone: "green"
  }
];

export const baselineRecommendations: DemoRecommendation[] = [
  {
    id: "urine-check",
    title: "Complete urine/protein check",
    rationale: "Urine field is blank, and proteinuria screen is expected in ANC review.",
    priority: "Medium",
    status: "Open",
    result: "Waiting for clinician follow-up",
    tone: "amber"
  },
  {
    id: "warning-screen",
    title: "Finish warning-sign screen",
    rationale: "Mid-consultation still needs explicit bleeding, fluid leakage, contraction, and fetal-movement review.",
    priority: "Medium",
    status: "In progress",
    result: "Partially addressed earlier",
    tone: "blue"
  }
];

export const baselineSummary =
  "G1P0, 39 years old, 20w0d by ultrasound. Baseline vitals stable. Mid-consultation review is in progress, with urine/protein result still missing and warning-sign screening not fully closed.";

export const baselineNote =
  "S: Patient is in routine mid-consultation ANC review. Reports mild fatigue, no contractions documented earlier.\n\nO: GA 20w0d by ultrasound. BP 112/72, HR 84. Weight 69 kg, height 168 cm, BMI 24.4. G1P0, no prior cesarean.\n\nA/P: Continue warning-sign screen, confirm fetal movement, complete urine/protein result, reinforce return precautions.";

export const demoTimeline: DemoEvent[] = [
  {
    at: 8,
    kind: "transcript",
    turn: {
      at: "09:00",
      speaker: "Clinician",
      role: "clinician",
      text: "Let me confirm again: have you started feeling the baby's movements today?",
      confidence: "0.97",
      status: "Live"
    }
  },
  {
    at: 11,
    kind: "transcript",
    turn: {
      at: "09:04",
      speaker: "Patient",
      role: "patient",
      text: "Yes, doctor. I have felt a few gentle movements, especially when I am resting.",
      confidence: "0.95",
      status: "Live"
    }
  },
  {
    at: 12,
    kind: "highlight",
    highlight: {
      id: "fetal-movement",
      type: "follow_up",
      title: "Fetal movement present",
      body: "Patient reports subtle fetal movement during rest; record as reassuring context for this visit.",
      severity: "Low",
      confidence: "0.91",
      tone: "green"
    }
  },
  {
    at: 14,
    kind: "observation",
    observation: {
      type: "symptoms",
      value: "Fetal movement present, described as subtle movements at rest",
      source: "live transcript",
      status: "unverified"
    }
  },
  {
    at: 16,
    kind: "transcript",
    turn: {
      at: "09:10",
      speaker: "Clinician",
      role: "clinician",
      text: "Have you had any bleeding, fluid leakage, or tightening in your abdomen like contractions?",
      confidence: "0.96",
      status: "Live"
    }
  },
  {
    at: 18,
    kind: "transcript",
    turn: {
      at: "09:14",
      speaker: "Patient",
      role: "patient",
      text: "No bleeding, no fluid leakage, and no contractions.",
      confidence: "0.94",
      status: "Live"
    }
  },
  {
    at: 18,
    kind: "rule",
    rule: {
      rule: "Contraction warning screen",
      severity: "info",
      blocking: "none",
      evidence: "Patient denies contractions in live transcript",
      status: "resolved"
    }
  },
  {
    at: 21,
    kind: "highlight",
    highlight: {
      id: "danger-denied",
      type: "risk",
      title: "Bleeding/fluid/contractions denied",
      body: "Danger-sign screen is partly addressed; no bleeding, fluid leakage, or contractions reported.",
      severity: "Low",
      confidence: "0.93",
      tone: "green"
    }
  },
  {
    at: 23,
    kind: "summary",
    summary:
      "Live update: fetal movement present. Patient denies bleeding, fluid leakage, and contractions. Continue ANC review and complete missing urine/protein documentation."
  },
  {
    at: 24,
    kind: "transcript",
    turn: {
      at: "09:20",
      speaker: "Clinician",
      role: "clinician",
      text: "Because you are thirty-nine and this is your first pregnancy, we will keep monitoring a little more carefully.",
      confidence: "0.95",
      status: "Live"
    }
  },
  {
    at: 26,
    kind: "highlight",
    highlight: {
      id: "age-linked",
      type: "memory",
      title: "Age risk linked to current visit",
      body: "Advanced maternal age remains a watch item; no autonomous diagnosis or triage is made.",
      severity: "Watch",
      confidence: "0.97",
      tone: "amber"
    }
  },
  {
    at: 28,
    kind: "transcript",
    turn: {
      at: "09:28",
      speaker: "Clinician",
      role: "clinician",
      text: "Today's urine result is not back yet, so we will complete the urine protein check before you go home.",
      confidence: "0.96",
      status: "Live"
    }
  },
  {
    at: 30,
    kind: "recommendation",
    recommendation: {
      id: "urine-check",
      title: "Complete urine/protein check",
      rationale: "Clinician confirms urine result is still pending during this segment.",
      priority: "High",
      status: "Open",
      result: "Escalated until urine/protein result is entered",
      tone: "red"
    }
  },
  {
    at: 32,
    kind: "transcript",
    turn: {
      at: "09:34",
      speaker: "Patient",
      role: "patient",
      text: "Okay, doctor. I will wait for the result before going home.",
      confidence: "0.92",
      status: "Live"
    }
  },
  {
    at: 35,
    kind: "transcript",
    turn: {
      at: "09:42",
      speaker: "Clinician",
      role: "clinician",
      text: "If you have bleeding, leaking fluid, severe pain, fever, or reduced fetal movement, please come back immediately.",
      confidence: "0.97",
      status: "Live"
    }
  },
  {
    at: 37,
    kind: "recommendation",
    recommendation: {
      id: "warning-screen",
      title: "Warning-sign counseling completed",
      rationale: "Clinician explains return precautions for bleeding, fluid leakage, severe pain, fever, or reduced movement.",
      priority: "Medium",
      status: "Done",
      result: "Counseling documented",
      tone: "green"
    }
  },
  {
    at: 40,
    kind: "note",
    note:
      "S: Patient reports subtle fetal movement at rest. Denies bleeding, fluid leakage, and contractions.\n\nO: GA 20w0d by ultrasound. BP 112/72, HR 84. Age 39, G1P0, no prior cesarean. Urine/protein result pending.\n\nWorking assessment: Mid-consultation ANC review remains active. Warning-sign counseling has just been covered. Urine/protein still needs completion before the clinician can finish the visit plan."
  },
  {
    at: 42,
    kind: "summary",
    summary:
      "Live working update: G1P0 age 39 at 20w0d with stable vitals. Fetal movement present; bleeding, fluid leakage, and contractions denied. Warning-sign counseling has been covered, while urine/protein remains open and the consultation is still in progress."
  }
];

export const demoEndSeconds = 42;
