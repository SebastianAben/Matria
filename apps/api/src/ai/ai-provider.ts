import type {
  ClinicalPreflight,
  Encounter,
  GeneratedOutput,
  StructuredObservation,
} from '@matria/contracts';

export type SynthesisKind = GeneratedOutput['kind'];

export type EvidenceToolResult = {
  source: 'medgemma';
  findings: string[];
};

export type EvidenceToolAdapter = {
  collectEvidence(input: {
    encounter: Encounter;
    observations: StructuredObservation[];
  }): Promise<EvidenceToolResult>;
};

export type SynthesisDraft = {
  kind: SynthesisKind;
  content: string;
  preservesRuleResultIds: string[];
  uncertaintyNotes: string[];
};

export type SynthesisProvider = {
  name: 'gemini';
  synthesize(input: {
    encounter: Encounter;
    observations: StructuredObservation[];
    preflight: ClinicalPreflight;
    evidence: EvidenceToolResult;
    kinds: SynthesisKind[];
  }): Promise<SynthesisDraft[]>;
};

export function createMedGemmaEvidenceToolAdapter(): EvidenceToolAdapter {
  return {
    async collectEvidence({ observations }) {
      const findings = observations.map((observation) => {
        const label = observation.code ?? observation.kind;
        return `${label}: ${String(observation.value)}${observation.unit ? ` ${observation.unit}` : ''}`;
      });

      return {
        source: 'medgemma',
        findings,
      };
    },
  };
}

export function createGeminiSynthesisProvider(): SynthesisProvider {
  return {
    name: 'gemini',
    async synthesize({ preflight, evidence, kinds }) {
      const ruleLines = preflight.ruleResults.map(
        (rule) => `${rule.severity.toUpperCase()}: ${rule.message}`,
      );
      const uncertaintyLines = preflight.uncertainty.map((item) => item.message);
      const evidenceLines = evidence.findings.slice(0, 6);

      return kinds.map((kind) => ({
        kind,
        content: [
          `${kind.replaceAll('_', ' ')} draft.`,
          ...ruleLines,
          ...uncertaintyLines,
          ...evidenceLines,
        ].join('\n'),
        preservesRuleResultIds: preflight.ruleResults.map((rule) => rule.id),
        uncertaintyNotes: uncertaintyLines,
      }));
    },
  };
}
