import type { CreateStructuredObservationRequest } from '@matria/contracts';

export const demoPatient = {
  hospitalRecordNumber: 'MRN-ANC-2042',
  displayName: 'Ayu Lestari',
  dateOfBirth: '1995-03-12',
};

export const demoEpisode = {
  estimatedDueDate: '2026-09-18',
};

export const demoObservations: CreateStructuredObservationRequest[] = [
  {
    kind: 'blood_pressure',
    code: 'systolic_bp',
    value: 168,
    unit: 'mmHg',
    confidence: 0.99,
    source: 'manual',
    verifiedByClinician: true,
  },
  {
    kind: 'blood_pressure',
    code: 'diastolic_bp',
    value: 112,
    unit: 'mmHg',
    confidence: 0.99,
    source: 'manual',
    verifiedByClinician: true,
  },
  {
    kind: 'gestational_age',
    code: 'gestational_age_weeks',
    value: 28,
    unit: 'weeks',
    confidence: 0.95,
    source: 'manual',
    verifiedByClinician: true,
  },
  {
    kind: 'symptom',
    code: 'symptom_headache',
    value: true,
    confidence: 0.82,
    source: 'audio_transcript',
    verifiedByClinician: false,
  },
  {
    kind: 'symptom',
    code: 'symptom_visual_disturbance',
    value: true,
    confidence: 0.78,
    source: 'audio_transcript',
    verifiedByClinician: false,
  },
];

export const captureSurfaces = [
  ['Audio', 'ANC conversation transcript source queued'],
  ['Vitals', 'BP, gestational age, symptoms captured as structured observations'],
  ['Files', 'Lab and record upload metadata surface prepared'],
  ['Ultrasound', 'Media review slot prepared for sonographer evidence'],
] as const;
