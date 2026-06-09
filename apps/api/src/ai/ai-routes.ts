import {
  editGeneratedOutputRequestSchema,
  generatedOutputListResponseSchema,
  generatedOutputResponseSchema,
  patientMemoryListResponseSchema,
  requestSynthesisRequestSchema,
  reviewGeneratedOutputRequestSchema,
} from '@matria/contracts';
import { Router } from 'express';

import type { AuditWriter } from '../audit/audit-log.js';
import { requirePermission } from '../auth/rbac.js';
import type { ClinicalStore } from '../clinical/clinical-store.js';
import { buildClinicalPreflight } from '../clinical/rules-engine.js';
import { HttpError } from '../errors.js';
import type { EvidenceToolAdapter, SynthesisProvider } from './ai-provider.js';
import type { MemoryStore, OutputStore } from './output-store.js';
import { ensureOutputCanWriteMemory, validateSynthesisDraft } from './output-validator.js';

function getRouteParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_route_parameter', `Route parameter ${name} is required.`);
  }

  return value;
}

export function createAiRouter(dependencies: {
  clinicalStore: ClinicalStore;
  auditWriter: AuditWriter;
  outputStore: OutputStore;
  memoryStore: MemoryStore;
  synthesisProvider: SynthesisProvider;
  evidenceTool: EvidenceToolAdapter;
  allowTestProviderFailure?: boolean;
}) {
  const router = Router();
  const {
    allowTestProviderFailure = false,
    auditWriter,
    clinicalStore,
    evidenceTool,
    memoryStore,
    outputStore,
    synthesisProvider,
  } = dependencies;

  router.post(
    '/encounters/:encounterId/synthesis',
    requirePermission('ai:synthesis:request'),
    async (req, res, next) => {
      try {
        const encounterId = getRouteParam(req.params.encounterId, 'encounterId');
        const request = requestSynthesisRequestSchema.parse(req.body ?? {});
        const encounter = await clinicalStore.getEncounter(encounterId);

        if (!encounter) {
          throw new HttpError(404, 'encounter_not_found', 'Encounter was not found.');
        }

        const observations = await clinicalStore.listObservations(encounter.id);
        const preflight = buildClinicalPreflight(encounter, observations);

        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'ai.preflight.checked',
          resourceType: 'encounter',
          resourceId: encounter.id,
          patientId: encounter.patientId,
          pregnancyEpisodeId: encounter.pregnancyEpisodeId,
        });

        if (!preflight.readyForSynthesis) {
          throw new HttpError(
            409,
            'preflight_incomplete',
            'AI synthesis is blocked until required preflight prompts are resolved.',
          );
        }

        try {
          if (allowTestProviderFailure && req.get('x-matria-test-provider-failure') === 'true') {
            throw new Error('test provider failure requested');
          }

          const evidence = await evidenceTool.collectEvidence({ encounter, observations });
          await auditWriter.record({
            actorUserId: req.user?.id,
            action: 'ai.tool.medgemma.collect_evidence',
            resourceType: 'encounter',
            resourceId: encounter.id,
            patientId: encounter.patientId,
            pregnancyEpisodeId: encounter.pregnancyEpisodeId,
          });

          const drafts = await synthesisProvider.synthesize({
            encounter,
            observations,
            preflight,
            evidence,
            kinds: request.kinds,
          });
          await auditWriter.record({
            actorUserId: req.user?.id,
            action: 'ai.provider.gemini.synthesize',
            resourceType: 'encounter',
            resourceId: encounter.id,
            patientId: encounter.patientId,
            pregnancyEpisodeId: encounter.pregnancyEpisodeId,
          });

          const validatedDrafts = drafts.map((draft) => validateSynthesisDraft(draft, preflight));
          const outputs = await outputStore.createDrafts(encounter.id, validatedDrafts);

          await auditWriter.record({
            actorUserId: req.user?.id,
            action: 'generated_output.create_draft',
            resourceType: 'encounter',
            resourceId: encounter.id,
            patientId: encounter.patientId,
            pregnancyEpisodeId: encounter.pregnancyEpisodeId,
          });

          res.status(201).json(generatedOutputListResponseSchema.parse({ data: outputs }));
        } catch (error) {
          if (error instanceof HttpError) {
            throw error;
          }

          await auditWriter.record({
            actorUserId: req.user?.id,
            action: 'ai.provider.failure',
            resourceType: 'encounter',
            resourceId: encounter.id,
            patientId: encounter.patientId,
            pregnancyEpisodeId: encounter.pregnancyEpisodeId,
          });
          throw new HttpError(
            502,
            'ai_provider_failed',
            'AI provider failed; deterministic preflight results remain available.',
          );
        }
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/encounters/:encounterId/outputs',
    requirePermission('patient:read'),
    async (req, res, next) => {
      try {
        const outputs = await outputStore.listByEncounter(
          getRouteParam(req.params.encounterId, 'encounterId'),
        );
        res.json(generatedOutputListResponseSchema.parse({ data: outputs }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/outputs/:outputId',
    requirePermission('output:approve'),
    async (req, res, next) => {
      try {
        const request = editGeneratedOutputRequestSchema.parse(req.body);
        const output = await outputStore.edit(
          getRouteParam(req.params.outputId, 'outputId'),
          request.content,
        );
        res.json(generatedOutputResponseSchema.parse({ data: output }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/outputs/:outputId/approve',
    requirePermission('output:approve'),
    async (req, res, next) => {
      try {
        const request = reviewGeneratedOutputRequestSchema.parse(req.body ?? {});
        const output = await outputStore.approve(
          getRouteParam(req.params.outputId, 'outputId'),
          req.user?.id ?? '',
          request.editedContent,
        );
        const encounter = await clinicalStore.getEncounter(output.encounterId);

        if (!encounter) {
          throw new HttpError(404, 'encounter_not_found', 'Encounter was not found.');
        }

        ensureOutputCanWriteMemory(output);
        await memoryStore.writeApprovedOutput({
          patientId: encounter.patientId,
          pregnancyEpisodeId: encounter.pregnancyEpisodeId,
          encounterId: encounter.id,
          output,
        });
        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'generated_output.approve_and_write_memory',
          resourceType: 'generated_output',
          resourceId: output.id,
          patientId: encounter.patientId,
          pregnancyEpisodeId: encounter.pregnancyEpisodeId,
        });

        res.json(generatedOutputResponseSchema.parse({ data: output }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/outputs/:outputId/reject',
    requirePermission('output:approve'),
    async (req, res, next) => {
      try {
        const output = await outputStore.reject(
          getRouteParam(req.params.outputId, 'outputId'),
          req.user?.id ?? '',
        );
        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'generated_output.reject',
          resourceType: 'generated_output',
          resourceId: output.id,
        });

        res.json(generatedOutputResponseSchema.parse({ data: output }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/patients/:patientId/pregnancy-episodes/:pregnancyEpisodeId/memory',
    requirePermission('patient:read'),
    async (req, res, next) => {
      try {
        const entries = await memoryStore.listByScope(
          getRouteParam(req.params.patientId, 'patientId'),
          getRouteParam(req.params.pregnancyEpisodeId, 'pregnancyEpisodeId'),
        );
        res.json(patientMemoryListResponseSchema.parse({ data: entries }));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
