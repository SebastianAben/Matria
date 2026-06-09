import { randomUUID } from 'node:crypto';

import type { ClinicalApproval, FhirExport, GeneratedOutput } from '@matria/contracts';

import type { ClinicalStore } from '../clinical/clinical-store.js';
import { HttpError } from '../errors.js';
import { formatApprovedOutputAsFhirR4 } from './fhir-formatter.js';

export type FhirExportStore = {
  createForApprovedOutput(input: {
    output: GeneratedOutput;
    approval: ClinicalApproval;
    clinicalStore: ClinicalStore;
  }): Promise<FhirExport>;
  list(): Promise<FhirExport[]>;
};

export function createInMemoryFhirExportStore(): FhirExportStore {
  const exports = new Map<string, FhirExport>();

  return {
    async createForApprovedOutput({ approval, clinicalStore, output }) {
      const encounter = await clinicalStore.getEncounter(output.encounterId);
      if (!encounter) {
        throw new HttpError(404, 'encounter_not_found', 'Encounter was not found.');
      }

      const patient = await clinicalStore.getPatient(encounter.patientId);
      const pregnancyEpisode = await clinicalStore.getPregnancyEpisode(
        encounter.pregnancyEpisodeId,
      );
      if (!patient || !pregnancyEpisode) {
        throw new HttpError(
          409,
          'clinical_scope_incomplete',
          'FHIR export clinical scope is incomplete.',
        );
      }

      const artifact = formatApprovedOutputAsFhirR4({
        exportId: randomUUID(),
        encounter,
        patient,
        pregnancyEpisode,
        output,
        approval,
        generatedAt: new Date().toISOString(),
      });
      exports.set(artifact.id, artifact);
      return artifact;
    },
    async list() {
      return [...exports.values()];
    },
  };
}
