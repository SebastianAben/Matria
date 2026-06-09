import {
  clinicalPreflightResponseSchema,
  createEncounterRequestSchema,
  createPatientRequestSchema,
  createPregnancyEpisodeRequestSchema,
  createStructuredObservationRequestSchema,
  encounterResponseSchema,
  patientResponseSchema,
  pregnancyEpisodeResponseSchema,
  structuredObservationListResponseSchema,
  structuredObservationResponseSchema,
} from '@matria/contracts';
import { Router } from 'express';

import type { AuditWriter } from '../audit/audit-log.js';
import { requirePermission } from '../auth/rbac.js';
import { HttpError } from '../errors.js';
import { buildClinicalPreflight } from './rules-engine.js';
import type { ClinicalStore } from './clinical-store.js';

function getRouteParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_route_parameter', `Route parameter ${name} is required.`);
  }

  return value;
}

export function createClinicalRouter(clinicalStore: ClinicalStore, auditWriter: AuditWriter) {
  const router = Router();

  router.post('/patients', requirePermission('encounter:write'), async (req, res, next) => {
    try {
      const patient = await clinicalStore.createPatient(createPatientRequestSchema.parse(req.body));
      await auditWriter.record({
        actorUserId: req.user?.id,
        action: 'patient.create',
        resourceType: 'patient',
        resourceId: patient.id,
        patientId: patient.id,
      });

      res.status(201).json(patientResponseSchema.parse({ data: patient }));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/patients/:patientId/pregnancy-episodes',
    requirePermission('encounter:write'),
    async (req, res, next) => {
      try {
        const episode = await clinicalStore.createPregnancyEpisode(
          getRouteParam(req.params.patientId, 'patientId'),
          createPregnancyEpisodeRequestSchema.parse(req.body),
        );
        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'pregnancy_episode.create',
          resourceType: 'pregnancy_episode',
          resourceId: episode.id,
          patientId: episode.patientId,
          pregnancyEpisodeId: episode.id,
        });

        res.status(201).json(pregnancyEpisodeResponseSchema.parse({ data: episode }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/encounters', requirePermission('encounter:write'), async (req, res, next) => {
    try {
      const encounter = await clinicalStore.createEncounter(
        createEncounterRequestSchema.parse(req.body),
      );
      await auditWriter.record({
        actorUserId: req.user?.id,
        action: 'encounter.create',
        resourceType: 'encounter',
        resourceId: encounter.id,
        patientId: encounter.patientId,
        pregnancyEpisodeId: encounter.pregnancyEpisodeId,
      });

      res.status(201).json(encounterResponseSchema.parse({ data: encounter }));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/encounters/:encounterId/observations',
    requirePermission('encounter:write'),
    async (req, res, next) => {
      try {
        const observation = await clinicalStore.addObservation(
          getRouteParam(req.params.encounterId, 'encounterId'),
          createStructuredObservationRequestSchema.parse(req.body),
        );
        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'observation.create',
          resourceType: 'structured_observation',
          resourceId: observation.id,
        });

        res.status(201).json(structuredObservationResponseSchema.parse({ data: observation }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/encounters/:encounterId/observations',
    requirePermission('patient:read'),
    async (req, res, next) => {
      try {
        const observations = await clinicalStore.listObservations(
          getRouteParam(req.params.encounterId, 'encounterId'),
        );
        res.json(structuredObservationListResponseSchema.parse({ data: observations }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/encounters/:encounterId/preflight',
    requirePermission('ai:synthesis:request'),
    async (req, res, next) => {
      try {
        const encounter = await clinicalStore.getEncounter(
          getRouteParam(req.params.encounterId, 'encounterId'),
        );

        if (!encounter) {
          throw new HttpError(404, 'encounter_not_found', 'Encounter was not found.');
        }

        const observations = await clinicalStore.listObservations(encounter.id);
        const preflight = buildClinicalPreflight(encounter, observations);
        await auditWriter.record({
          actorUserId: req.user?.id,
          action: 'encounter.preflight',
          resourceType: 'encounter',
          resourceId: encounter.id,
          patientId: encounter.patientId,
          pregnancyEpisodeId: encounter.pregnancyEpisodeId,
        });

        res.json(clinicalPreflightResponseSchema.parse({ data: preflight }));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
