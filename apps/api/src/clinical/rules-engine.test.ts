import {
  missingFieldAncObservations,
  normalAncObservations,
  severeHypertensionObservations,
  urgentAncEncounter,
} from '@matria/test-fixtures';

import { buildClinicalPreflight, evaluateMaternalRedFlags } from './rules-engine.js';

describe('maternal rules engine', () => {
  it('triggers severe hypertension as a deterministic critical rule', () => {
    const results = evaluateMaternalRedFlags(urgentAncEncounter, severeHypertensionObservations);

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'severe-hypertension',
          severity: 'critical',
          mustAcknowledge: true,
          evidence: expect.arrayContaining(['systolic=170', 'diastolic=112']),
        }),
      ]),
    );
  });

  it('does not trigger red flags for normal ANC observations', () => {
    const results = evaluateMaternalRedFlags(urgentAncEncounter, normalAncObservations);

    expect(results).toEqual([]);
  });

  it('creates required prompts before AI synthesis when mandatory fields are missing', () => {
    const preflight = buildClinicalPreflight(urgentAncEncounter, missingFieldAncObservations);

    expect(preflight.readyForSynthesis).toBe(false);
    expect(preflight.prompts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'diastolic_bp', severity: 'required' }),
        expect.objectContaining({ field: 'gestational_age_weeks', severity: 'required' }),
      ]),
    );
  });
});
