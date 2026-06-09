import { fhirExportResponseSchema } from '@matria/contracts';
import { Router } from 'express';

import type { OutputStore } from '../ai/output-store.js';
import type { AuditWriter } from '../audit/audit-log.js';
import { requirePermission } from '../auth/rbac.js';
import type { ClinicalStore } from '../clinical/clinical-store.js';
import { HttpError } from '../errors.js';
import type { FhirExportStore } from './fhir-store.js';

function getRouteParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_route_parameter', `Route parameter ${name} is required.`);
  }

  return value;
}

export function createFhirRouter(dependencies: {
  auditWriter: AuditWriter;
  clinicalStore: ClinicalStore;
  outputStore: OutputStore;
  fhirExportStore: FhirExportStore;
}) {
  const router = Router();
  const { auditWriter, clinicalStore, fhirExportStore, outputStore } = dependencies;

  router.post(
    '/outputs/:outputId/export',
    requirePermission('fhir:export'),
    async (req, res, next) => {
      try {
        const outputId = getRouteParam(req.params.outputId, 'outputId');
        const output = await outputStore.get(outputId);
        if (!output) {
          throw new HttpError(404, 'generated_output_not_found', 'Generated output was not found.');
        }

        if (output.status !== 'approved') {
          throw new HttpError(
            409,
            'output_not_approved',
            'FHIR export requires an approved generated output.',
          );
        }

        const approval = (await outputStore.listApprovals())
          .filter((item) => item.outputId === output.id && item.action !== 'rejected')
          .at(-1);
        if (!approval) {
          throw new HttpError(
            409,
            'approval_provenance_missing',
            'FHIR export requires approval provenance.',
          );
        }

        const artifact = await fhirExportStore.createForApprovedOutput({
          output,
          approval,
          clinicalStore,
        });
        const encounter = await clinicalStore.getEncounter(output.encounterId);

        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'fhir_export.generate',
          resourceType: 'fhir_export',
          resourceId: artifact.id,
          patientId: encounter?.patientId,
          pregnancyEpisodeId: encounter?.pregnancyEpisodeId,
        });

        res.status(201).json(fhirExportResponseSchema.parse({ data: artifact }));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
