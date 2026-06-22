import request from "supertest";
import { createApp } from "../app.js";
import { seedRolesAndPermissions } from "../admin/routes.js";
import { hashPassword } from "../auth/passwords.js";
import { prisma } from "../db/prisma.js";

export const app = createApp();

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "ClinicalApproval",
      "GeneratedOutput",
      "MedicalEvidenceFinding",
      "MedicalEvidenceHandoffFrameSample",
      "MedicalEvidenceHandoffFile",
      "MedicalEvidenceHandoff",
      "MedicalEvidenceFrameSample",
      "SuggestionResult",
      "Suggestion",
      "HighlightCard",
      "SummaryRevision",
      "AiArtifactRevision",
      "AiToolCall",
      "SynthesisTick",
      "ContextSnapshot",
      "PatientMemoryFact",
      "TranscriptClinicalCandidate",
      "TranscriptTurn",
      "AudioSegment",
      "RuleResult",
      "RuleEvaluationRun",
      "AmbientSessionState",
      "ClinicalFile",
      "ConsentRecord",
      "StructuredObservation",
      "SessionNote",
      "Encounter",
      "PregnancyEpisode",
      "Patient",
      "Session",
      "UserRole",
      "RolePermission",
      "User",
      "Role",
      "Permission"
    RESTART IDENTITY CASCADE;
  `);
  await seedRolesAndPermissions();
}

export async function createUserWithRole(roleKey: string, emailPrefix = roleKey) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  return prisma.user.create({
    data: {
      email: `${emailPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
      fullName: `${roleKey} User`,
      passwordHash: await hashPassword("password-123"),
      roles: { create: { roleId: role.id } }
    }
  });
}

export async function login(email: string, password = "password-123") {
  const response = await request(app).post("/auth/login").send({ email, password });
  const cookie = response.headers["set-cookie"] as string[] | string | undefined;
  if (!cookie) return [];
  return Array.isArray(cookie) ? cookie : [cookie];
}

export async function createScopedEncounter(cookie: string[]) {
  const patientResponse = await request(app)
    .post("/patients")
    .set("Cookie", cookie)
    .send({ hospitalNumber: `MR-${Date.now()}`, fullName: "Nadia Putri" });
  const patientId = patientResponse.body.data.patient.id;

  const episodeResponse = await request(app)
    .post(`/patients/${patientId}/pregnancy-episodes`)
    .set("Cookie", cookie)
    .send({ label: "Current pregnancy", gestationalAgeWeeks: 24, status: "active" });
  const pregnancyEpisodeId = episodeResponse.body.data.pregnancyEpisode.id;

  const encounterResponse = await request(app)
    .post("/encounters")
    .set("Cookie", cookie)
    .send({ patientId, pregnancyEpisodeId, visitType: "routine_anc" });

  return {
    patientId,
    pregnancyEpisodeId,
    encounterId: encounterResponse.body.data.encounter.id
  };
}
