import type { ClinicalPreflight, GeneratedOutput } from '@matria/contracts';

import { HttpError } from '../errors.js';
import type { SynthesisDraft } from './ai-provider.js';

export function validateSynthesisDraft(draft: SynthesisDraft, preflight: ClinicalPreflight) {
  const hardFlagIds = preflight.ruleResults
    .filter((rule) => rule.mustAcknowledge || rule.severity === 'critical')
    .map((rule) => rule.id);
  const missingHardFlags = hardFlagIds.filter((id) => !draft.preservesRuleResultIds.includes(id));

  if (missingHardFlags.length > 0) {
    throw new HttpError(
      502,
      'ai_output_failed_safety_validation',
      'AI draft did not preserve deterministic clinical rule results.',
    );
  }

  const requiredUncertaintyNotes = preflight.uncertainty.map((item) => item.message);
  const uncertaintyNotes = [...new Set([...draft.uncertaintyNotes, ...requiredUncertaintyNotes])];

  return {
    ...draft,
    uncertaintyNotes,
  };
}

export function ensureOutputCanWriteMemory(output: GeneratedOutput) {
  if (output.status !== 'approved') {
    throw new HttpError(
      409,
      'output_not_approved',
      'Patient memory writes require an approved generated output.',
    );
  }
}
