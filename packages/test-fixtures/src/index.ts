import type {
  Encounter,
  Patient,
  PregnancyEpisode,
  RuleResult,
  StructuredObservation,
} from '@matria/contracts';

export const syntheticPatient: Patient = {
  id: '6c9ea3be-0e4e-4e9c-93a3-6a9ec3556d9d',
  hospitalRecordNumber: 'SYN-ANC-0001',
  displayName: 'Synthetic ANC Patient',
  dateOfBirth: '1996-04-12',
  createdAt: '2026-06-09T14:18:28.000Z',
};

export const activePregnancyEpisode: PregnancyEpisode = {
  id: 'd6643dfc-a07a-4961-b0c7-46736278721d',
  patientId: syntheticPatient.id,
  status: 'active',
  estimatedDueDate: '2026-10-20',
  createdAt: '2026-06-09T14:18:28.000Z',
};

export const urgentAncEncounter: Encounter = {
  id: '964c1f2f-ad46-4e31-a7b9-a27d2f6405ba',
  patientId: syntheticPatient.id,
  pregnancyEpisodeId: activePregnancyEpisode.id,
  type: 'urgent_review',
  status: 'preflight_complete',
  startedAt: '2026-06-09T14:18:28.000Z',
};

export const severeHypertensionRuleHit: RuleResult = {
  id: '44b6aa5b-f0f7-4884-b731-91813f0d44a9',
  encounterId: urgentAncEncounter.id,
  ruleId: 'severe-hypertension',
  severity: 'critical',
  message: 'Severe-range blood pressure requires immediate clinician review.',
  evidence: ['systolic=170', 'diastolic=112'],
  threshold: 'systolic >= 160 or diastolic >= 110',
  mustAcknowledge: true,
};

const normalSystolicObservation: StructuredObservation = {
  id: 'f8ae38e0-9192-405d-a2a5-54d16a4d1e66',
  encounterId: urgentAncEncounter.id,
  kind: 'blood_pressure',
  code: 'systolic_bp',
  value: 118,
  unit: 'mmHg',
  confidence: 0.98,
  source: 'manual',
  verifiedByClinician: true,
};

const normalDiastolicObservation: StructuredObservation = {
  id: '612af8f7-f6d9-49ab-aa55-ffad99468304',
  encounterId: urgentAncEncounter.id,
  kind: 'blood_pressure',
  code: 'diastolic_bp',
  value: 76,
  unit: 'mmHg',
  confidence: 0.98,
  source: 'manual',
  verifiedByClinician: true,
};

const normalGestationalAgeObservation: StructuredObservation = {
  id: '4d245c72-1f14-4bde-a986-11b6fa4eb9eb',
  encounterId: urgentAncEncounter.id,
  kind: 'gestational_age',
  code: 'gestational_age_weeks',
  value: 22,
  unit: 'weeks',
  confidence: 0.95,
  source: 'manual',
  verifiedByClinician: true,
};

export const normalAncObservations: StructuredObservation[] = [
  normalSystolicObservation,
  normalDiastolicObservation,
  normalGestationalAgeObservation,
];

export const severeHypertensionObservations: StructuredObservation[] = [
  {
    ...normalSystolicObservation,
    id: '8ee8bce5-2bc6-42f4-a6b3-fbc0d678ab69',
    value: 170,
  },
  {
    ...normalDiastolicObservation,
    id: '6c07a4ce-3796-450f-bac4-df75ff8159ff',
    value: 112,
  },
  normalGestationalAgeObservation,
];

export const missingFieldAncObservations: StructuredObservation[] = [normalSystolicObservation];
