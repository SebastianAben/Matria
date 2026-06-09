import {
  clinicalPreflightSchema,
  fhirExportSchema,
  generatedOutputSchema,
  patientMemoryEntrySchema,
  roleNameSchema,
  ruleResultSchema,
} from './domain.js';

describe('domain contracts', () => {
  it('keeps RBAC role names explicit', () => {
    expect(roleNameSchema.options).toContain('clinician');
    expect(roleNameSchema.options).toContain('auditor');
    expect(roleNameSchema.options).toContain('it_operator');
  });

  it('models must-acknowledge deterministic rule results', () => {
    const parsed = ruleResultSchema.parse({
      id: '44b6aa5b-f0f7-4884-b731-91813f0d44a9',
      encounterId: '964c1f2f-ad46-4e31-a7b9-a27d2f6405ba',
      ruleId: 'severe-hypertension',
      severity: 'critical',
      message: 'Systolic blood pressure is at or above severe threshold.',
      evidence: ['systolic=170'],
      threshold: 'systolic >= 160',
      mustAcknowledge: true,
    });

    expect(parsed.mustAcknowledge).toBe(true);
  });

  it('models preflight prompts and uncertainty before AI synthesis', () => {
    const parsed = clinicalPreflightSchema.parse({
      encounterId: '964c1f2f-ad46-4e31-a7b9-a27d2f6405ba',
      readyForSynthesis: false,
      prompts: [
        {
          field: 'diastolic_bp',
          message: 'Required ANC field diastolic_bp is missing before AI synthesis.',
          severity: 'required',
        },
      ],
      ruleResults: [],
      uncertainty: [
        {
          field: 'systolic_bp',
          reason: 'low_confidence',
          message: 'Observation confidence is below the clinical review threshold.',
        },
      ],
    });

    expect(parsed.readyForSynthesis).toBe(false);
  });

  it('models generated output review and approved patient memory', () => {
    const output = generatedOutputSchema.parse({
      id: 'b5985548-4248-4ae5-863e-ac14ff474a52',
      encounterId: '964c1f2f-ad46-4e31-a7b9-a27d2f6405ba',
      kind: 'risk_synthesis',
      status: 'draft',
      content: 'Draft risk synthesis.',
      preservesRuleResultIds: ['44b6aa5b-f0f7-4884-b731-91813f0d44a9'],
      uncertaintyNotes: ['Observation has not been verified by a clinician.'],
      createdAt: '2026-06-09T14:18:28.000Z',
    });
    const memory = patientMemoryEntrySchema.parse({
      id: '1595256f-dc25-47ec-acac-8eb5522cc5ac',
      patientId: '6c9ea3be-0e4e-4e9c-93a3-6a9ec3556d9d',
      pregnancyEpisodeId: 'd6643dfc-a07a-4961-b0c7-46736278721d',
      encounterId: output.encounterId,
      sourceOutputId: output.id,
      content: output.content,
      createdAt: '2026-06-09T14:18:28.000Z',
    });

    expect(output.status).toBe('draft');
    expect(memory.sourceOutputId).toBe(output.id);
  });

  it('models FHIR export provenance for approved outputs', () => {
    const parsed = fhirExportSchema.parse({
      id: 'f038ff92-8a3b-44fa-85e6-3102f69d95ca',
      encounterId: '964c1f2f-ad46-4e31-a7b9-a27d2f6405ba',
      outputId: 'b5985548-4248-4ae5-863e-ac14ff474a52',
      approvingClinicianUserId: '343f9737-e017-469d-af7e-78cdd15a459f',
      status: 'generated',
      generatedAt: '2026-06-09T14:18:28.000Z',
      artifactJson: {
        resourceType: 'Bundle',
        type: 'document',
      },
    });

    expect(parsed.artifactJson).toMatchObject({ resourceType: 'Bundle' });
  });
});
