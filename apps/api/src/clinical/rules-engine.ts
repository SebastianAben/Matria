import { randomUUID } from 'node:crypto';

import type {
  ClinicalPreflight,
  Encounter,
  RuleResult,
  StructuredObservation,
  UncertaintyAnnotation,
} from '@matria/contracts';

const REQUIRED_OBSERVATION_CODES = [
  'systolic_bp',
  'diastolic_bp',
  'gestational_age_weeks',
] as const;

function findNumber(observations: StructuredObservation[], code: string) {
  const observation = observations.find(
    (item) => item.code === code && typeof item.value === 'number',
  );
  return observation?.value as number | undefined;
}

export function evaluateMaternalRedFlags(
  encounter: Encounter,
  observations: StructuredObservation[],
): RuleResult[] {
  const results: RuleResult[] = [];
  const systolic = findNumber(observations, 'systolic_bp');
  const diastolic = findNumber(observations, 'diastolic_bp');

  if (
    (systolic !== undefined && systolic >= 160) ||
    (diastolic !== undefined && diastolic >= 110)
  ) {
    results.push({
      id: randomUUID(),
      encounterId: encounter.id,
      ruleId: 'severe-hypertension',
      severity: 'critical',
      message: 'Severe-range blood pressure requires immediate clinician review.',
      evidence: [
        ...(systolic !== undefined ? [`systolic=${systolic}`] : []),
        ...(diastolic !== undefined ? [`diastolic=${diastolic}`] : []),
      ],
      threshold: 'systolic >= 160 or diastolic >= 110',
      mustAcknowledge: true,
    });
  }

  const headache = observations.some(
    (item) => item.code === 'symptom_headache' && item.value === true,
  );
  const visualSymptoms = observations.some(
    (item) => item.code === 'symptom_visual_disturbance' && item.value === true,
  );

  if (headache && visualSymptoms) {
    results.push({
      id: randomUUID(),
      encounterId: encounter.id,
      ruleId: 'preeclampsia-symptom-cluster',
      severity: 'urgent',
      message: 'Headache with visual symptoms should be reviewed for preeclampsia risk.',
      evidence: ['symptom_headache=true', 'symptom_visual_disturbance=true'],
      threshold: 'headache and visual disturbance present',
      mustAcknowledge: true,
    });
  }

  return results;
}

export function buildClinicalPreflight(
  encounter: Encounter,
  observations: StructuredObservation[],
): ClinicalPreflight {
  const prompts = REQUIRED_OBSERVATION_CODES.filter(
    (code) => !observations.some((item) => item.code === code),
  ).map((code) => ({
    field: code,
    message: `Required ANC field ${code} is missing before AI synthesis.`,
    severity: 'required' as const,
  }));

  const uncertainty: UncertaintyAnnotation[] = observations.flatMap((observation) => {
    const annotations: UncertaintyAnnotation[] = [];

    if (observation.confidence !== undefined && observation.confidence < 0.7) {
      annotations.push({
        observationId: observation.id,
        field: observation.code ?? observation.kind,
        reason: 'low_confidence',
        message: 'Observation confidence is below the clinical review threshold.',
      });
    }

    if (!observation.verifiedByClinician) {
      annotations.push({
        observationId: observation.id,
        field: observation.code ?? observation.kind,
        reason: 'unverified',
        message: 'Observation has not been verified by a clinician.',
      });
    }

    return annotations;
  });

  const ruleResults = evaluateMaternalRedFlags(encounter, observations);

  return {
    encounterId: encounter.id,
    readyForSynthesis: prompts.length === 0,
    prompts,
    ruleResults,
    uncertainty,
  };
}
