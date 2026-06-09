import { roleNameSchema, ruleResultSchema } from './domain.js';

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
});
