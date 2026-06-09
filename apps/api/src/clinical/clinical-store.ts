import { randomUUID } from 'node:crypto';

import type {
  CreateEncounterRequest,
  CreatePatientRequest,
  CreatePregnancyEpisodeRequest,
  CreateStructuredObservationRequest,
  Encounter,
  Patient,
  PregnancyEpisode,
  StructuredObservation,
} from '@matria/contracts';

import { HttpError } from '../errors.js';

export type ClinicalStore = {
  createPatient(input: CreatePatientRequest): Promise<Patient>;
  getPatient(patientId: string): Promise<Patient | undefined>;
  createPregnancyEpisode(
    patientId: string,
    input: CreatePregnancyEpisodeRequest,
  ): Promise<PregnancyEpisode>;
  getPregnancyEpisode(episodeId: string): Promise<PregnancyEpisode | undefined>;
  createEncounter(input: CreateEncounterRequest): Promise<Encounter>;
  getEncounter(encounterId: string): Promise<Encounter | undefined>;
  addObservation(
    encounterId: string,
    input: CreateStructuredObservationRequest,
  ): Promise<StructuredObservation>;
  listObservations(encounterId: string): Promise<StructuredObservation[]>;
};

export function createInMemoryClinicalStore(): ClinicalStore {
  const patients = new Map<string, Patient>();
  const pregnancyEpisodes = new Map<string, PregnancyEpisode>();
  const encounters = new Map<string, Encounter>();
  const observations = new Map<string, StructuredObservation[]>();

  return {
    async createPatient(input) {
      const patient: Patient = {
        id: randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      };
      patients.set(patient.id, patient);
      return patient;
    },
    async getPatient(patientId) {
      return patients.get(patientId);
    },
    async createPregnancyEpisode(patientId, input) {
      if (!patients.has(patientId)) {
        throw new HttpError(404, 'patient_not_found', 'Patient was not found.');
      }

      const episode: PregnancyEpisode = {
        id: randomUUID(),
        patientId,
        status: 'active',
        ...input,
        createdAt: new Date().toISOString(),
      };
      pregnancyEpisodes.set(episode.id, episode);
      return episode;
    },
    async getPregnancyEpisode(episodeId) {
      return pregnancyEpisodes.get(episodeId);
    },
    async createEncounter(input) {
      const patient = patients.get(input.patientId);
      const episode = pregnancyEpisodes.get(input.pregnancyEpisodeId);

      if (!patient) {
        throw new HttpError(404, 'patient_not_found', 'Patient was not found.');
      }

      if (!episode || episode.patientId !== patient.id) {
        throw new HttpError(
          400,
          'pregnancy_scope_mismatch',
          'Pregnancy episode must belong to the encounter patient.',
        );
      }

      const encounter: Encounter = {
        id: randomUUID(),
        ...input,
        status: 'draft',
        startedAt: new Date().toISOString(),
      };
      encounters.set(encounter.id, encounter);
      observations.set(encounter.id, []);
      return encounter;
    },
    async getEncounter(encounterId) {
      return encounters.get(encounterId);
    },
    async addObservation(encounterId, input) {
      if (!encounters.has(encounterId)) {
        throw new HttpError(404, 'encounter_not_found', 'Encounter was not found.');
      }

      const observation: StructuredObservation = {
        id: randomUUID(),
        encounterId,
        ...input,
        verifiedByClinician: input.verifiedByClinician ?? false,
      };
      observations.set(encounterId, [...(observations.get(encounterId) ?? []), observation]);
      return observation;
    },
    async listObservations(encounterId) {
      if (!encounters.has(encounterId)) {
        throw new HttpError(404, 'encounter_not_found', 'Encounter was not found.');
      }

      return observations.get(encounterId) ?? [];
    },
  };
}
