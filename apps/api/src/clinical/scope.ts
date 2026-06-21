import type { Encounter } from "@prisma/client";
import { AppError, notFound } from "../http/errors.js";
import { prisma } from "../db/prisma.js";

export async function getEncounterOrThrow(encounterId: string): Promise<Encounter> {
  const encounter = await prisma.encounter.findUnique({ where: { id: encounterId } });
  if (!encounter) throw notFound("Encounter");
  return encounter;
}

export async function assertPregnancyBelongsToPatient(
  patientId: string,
  pregnancyEpisodeId: string
) {
  const episode = await prisma.pregnancyEpisode.findUnique({ where: { id: pregnancyEpisodeId } });
  if (!episode) throw notFound("Pregnancy episode");
  if (episode.patientId !== patientId) {
    throw new AppError(
      "SCOPE_MISMATCH",
      "Pregnancy episode does not belong to the requested patient.",
      409
    );
  }
  return episode;
}

export async function hasGrantedConsent(encounterId: string, mode: string) {
  const latest = await prisma.consentRecord.findFirst({
    where: { encounterId, mode: mode as never },
    orderBy: { createdAt: "desc" }
  });
  return latest?.status === "granted";
}

export async function requireConsent(encounterId: string, mode: string) {
  if (!(await hasGrantedConsent(encounterId, mode))) {
    throw new AppError("CONSENT_REQUIRED", `Consent is required for ${mode} processing.`, 409);
  }
}

export const allowedTransitions: Record<string, string[]> = {
  draft: ["active", "archived"],
  active: ["reviewing", "closed", "archived"],
  reviewing: ["active", "closed", "approved", "archived"],
  closed: ["reviewing", "approved", "archived"],
  approved: ["archived"],
  archived: []
};

export function assertEncounterTransition(from: string, to: string) {
  if (!allowedTransitions[from]?.includes(to)) {
    throw new AppError(
      "INVALID_STATE_TRANSITION",
      `Encounter cannot transition from ${from} to ${to}.`,
      409
    );
  }
}
