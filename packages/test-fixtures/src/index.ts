import type { Encounter, Patient, PregnancyEpisode, RuleResult } from '@matria/contracts';

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
