import { fhirExportCreateSchema, memoryWritebackSchema } from "@matria/shared";
import { Prisma, type GeneratedOutput } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { writeAudit } from "../audit.js";
import { requirePermission } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { requiredParam } from "../http/params.js";
import { sendOk } from "../http/responses.js";
import { requireConsent } from "../clinical/scope.js";

const approvedOutputStatuses = ["approved", "edited"] as const;

type ApprovedGeneratedOutput = GeneratedOutput & {
  approvals: Array<{
    id: string;
    action: string;
    actorId: string;
    note: string | null;
    editedContent: Prisma.JsonValue | null;
    previousStatus: string;
    nextStatus: string;
    provenance: Prisma.JsonValue | null;
    createdAt: Date;
  }>;
};

export const phase9OutputsRouter = Router();

phase9OutputsRouter.post(
  "/encounters/:encounterId/memory-writeback",
  requirePermission("output:approve"),
  async (req, res, next) => {
    try {
      const input = memoryWritebackSchema.parse(req.body);
      const result = await writeMemoryFromApprovedOutputs({
        encounterId: requiredParam(req, "encounterId"),
        actorId: req.currentUser!.id,
        requestId: req.requestId,
        sourceOutputIds: input.sourceOutputIds
      });
      return sendOk(req, res, result, 201);
    } catch (error) {
      return next(error);
    }
  }
);

phase9OutputsRouter.get(
  "/patients/:patientId/pregnancy-episodes/:episodeId/memory-facts",
  requirePermission("patient:read"),
  async (req, res, next) => {
    try {
      const patientId = requiredParam(req, "patientId");
      const episodeId = requiredParam(req, "episodeId");
      const episode = await prisma.pregnancyEpisode.findUnique({ where: { id: episodeId } });
      if (!episode) throw notFound("Pregnancy episode");
      if (episode.patientId !== patientId) {
        throw new AppError("SCOPE_MISMATCH", "Pregnancy episode does not belong to patient.", 409);
      }
      const memoryFacts = await prisma.patientMemoryFact.findMany({
        where: { patientId, pregnancyEpisodeId: episodeId, status: "approved" },
        orderBy: { createdAt: "desc" }
      });
      return sendOk(req, res, { memoryFacts });
    } catch (error) {
      return next(error);
    }
  }
);

phase9OutputsRouter.post(
  "/encounters/:encounterId/fhir-export",
  requirePermission("fhir:export"),
  async (req, res, next) => {
    try {
      const input = fhirExportCreateSchema.parse(req.body);
      const result = await generateFhirExport({
        encounterId: requiredParam(req, "encounterId"),
        actorId: req.currentUser!.id,
        requestId: req.requestId,
        exportKind: input.exportKind,
        sourceOutputId: input.sourceOutputId,
        destinationLabel: input.destinationLabel,
        note: input.note
      });
      return sendOk(req, res, result, 201);
    } catch (error) {
      return next(error);
    }
  }
);

phase9OutputsRouter.get(
  "/encounters/:encounterId/fhir-exports",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const encounterId = requiredParam(req, "encounterId");
      const encounter = await prisma.encounter.findUnique({ where: { id: encounterId } });
      if (!encounter) throw notFound("Encounter");
      const fhirExports = await prisma.fhirExport.findMany({
        where: { encounterId },
        include: {
          sourceOutput: { select: { id: true, outputType: true, title: true, status: true } },
          generatedBy: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: { generatedAt: "desc" }
      });
      return sendOk(req, res, { fhirExports });
    } catch (error) {
      return next(error);
    }
  }
);

phase9OutputsRouter.get(
  "/fhir-exports/:exportId",
  requirePermission("encounter:read"),
  async (req, res, next) => {
    try {
      const fhirExport = await prisma.fhirExport.findUnique({
        where: { id: requiredParam(req, "exportId") },
        include: {
          sourceOutput: { select: { id: true, outputType: true, title: true, status: true } },
          generatedBy: { select: { id: true, fullName: true, email: true } }
        }
      });
      if (!fhirExport) throw notFound("FHIR export");
      return sendOk(req, res, { fhirExport });
    } catch (error) {
      return next(error);
    }
  }
);

async function writeMemoryFromApprovedOutputs(input: {
  encounterId: string;
  actorId: string;
  requestId: string;
  sourceOutputIds?: string[];
}) {
  const encounter = await getScopedEncounter(input.encounterId);
  const outputs = await getApprovedOutputsForEncounter({
    encounterId: encounter.id,
    sourceOutputIds: input.sourceOutputIds
  });
  const rejectedSources = buildRejectedSources(input.sourceOutputIds, outputs);
  const createdMemoryFacts = [];
  const skippedDuplicates = [];
  let candidateCount = 0;

  for (const output of outputs) {
    const facts = extractMemoryFacts(output);
    candidateCount += facts.length;
    for (const content of facts) {
      const normalizedContent = normalizeFact(content);
      if (!normalizedContent) continue;
      const dedupeKey = hashText(normalizedContent);
      const provenance = memoryProvenance(output, input.actorId, encounter.id, dedupeKey);
      try {
        const memoryFact = await prisma.patientMemoryFact.create({
          data: {
            patientId: encounter.patientId,
            pregnancyEpisodeId: encounter.pregnancyEpisodeId,
            content: normalizedContent,
            dedupeKey,
            sourceType: "generated_output",
            sourceId: output.id,
            provenance: provenance as Prisma.InputJsonValue,
            createdById: input.actorId
          }
        });
        createdMemoryFacts.push(memoryFact);
      } catch (error) {
        if (isUniqueConflict(error)) {
          skippedDuplicates.push({
            sourceOutputId: output.id,
            content: normalizedContent,
            dedupeKey
          });
          continue;
        }
        throw error;
      }
    }
  }

  await writeAudit({
    actorId: input.actorId,
    action: "memory.writeback",
    targetType: "encounter",
    targetId: encounter.id,
    outcome: "success",
    requestId: input.requestId,
    metadata: {
      patientId: encounter.patientId,
      pregnancyEpisodeId: encounter.pregnancyEpisodeId,
      sourceOutputIds: outputs.map((output) => output.id),
      candidateCount,
      createdCount: createdMemoryFacts.length,
      duplicateCount: skippedDuplicates.length,
      rejectedSources
    }
  });

  return { createdMemoryFacts, skippedDuplicates, rejectedSources };
}

async function generateFhirExport(input: {
  encounterId: string;
  actorId: string;
  requestId: string;
  exportKind: "referral" | "teleconsult";
  sourceOutputId?: string;
  destinationLabel?: string;
  note?: string;
}) {
  const encounter = await getScopedEncounter(input.encounterId);
  await requireConsent(encounter.id, "fhir_export");
  await assertFhirSafetyGates(encounter.id);
  const sourceOutput = await resolveFhirSourceOutput({
    encounterId: encounter.id,
    exportKind: input.exportKind,
    sourceOutputId: input.sourceOutputId
  });
  const exportId = randomUUID();
  const generatedAt = new Date();
  const bundle = await buildFhirBundle({
    exportId,
    encounterId: encounter.id,
    actorId: input.actorId,
    sourceOutput,
    exportKind: input.exportKind,
    destinationLabel: input.destinationLabel,
    generatedAt
  });
  const sourceManifest = {
    generatedOutputIds: [sourceOutput.id],
    clinicalApprovalIds: sourceOutput.approvals.map((approval) => approval.id),
    sourceReferences: sourceOutput.sourceReferences,
    canonicalContentHash: hashText(
      JSON.stringify(sourceOutput.canonicalContent ?? sourceOutput.content)
    ),
    exportKind: input.exportKind
  };
  const provenance = {
    generatedById: input.actorId,
    generatedAt: generatedAt.toISOString(),
    sourceOutputId: sourceOutput.id,
    sourceOutputStatus: sourceOutput.status,
    approvalIds: sourceOutput.approvals.map((approval) => approval.id),
    approvalActions: sourceOutput.approvals.map((approval) => approval.action),
    destinationLabel: input.destinationLabel ?? null,
    note: input.note ?? null,
    externalSubmission: false
  };

  const fhirExport = await prisma.fhirExport.create({
    data: {
      id: exportId,
      encounterId: encounter.id,
      sourceOutputId: sourceOutput.id,
      exportKind: input.exportKind,
      status: "generated",
      destinationLabel: input.destinationLabel,
      note: input.note,
      fhirBundle: bundle as Prisma.InputJsonValue,
      sourceManifest: sourceManifest as Prisma.InputJsonValue,
      provenance: provenance as Prisma.InputJsonValue,
      generatedById: input.actorId,
      generatedAt
    }
  });

  await writeAudit({
    actorId: input.actorId,
    action: "fhir_export.generate",
    targetType: "fhir_export",
    targetId: fhirExport.id,
    outcome: "success",
    requestId: input.requestId,
    metadata: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      pregnancyEpisodeId: encounter.pregnancyEpisodeId,
      exportKind: input.exportKind,
      sourceOutputId: sourceOutput.id,
      approvalIds: sourceOutput.approvals.map((approval) => approval.id)
    }
  });

  return { fhirExport };
}

async function getScopedEncounter(encounterId: string) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: { pregnancyEpisode: true }
  });
  if (!encounter) throw notFound("Encounter");
  if (encounter.pregnancyEpisode.patientId !== encounter.patientId) {
    throw new AppError("SCOPE_MISMATCH", "Encounter scope is inconsistent.", 409);
  }
  return encounter;
}

async function getApprovedOutputsForEncounter(input: {
  encounterId: string;
  sourceOutputIds?: string[];
}) {
  const where: Prisma.GeneratedOutputWhereInput = {
    status: { in: [...approvedOutputStatuses] },
    ambientSession: { encounterId: input.encounterId }
  };
  if (input.sourceOutputIds?.length) where.id = { in: input.sourceOutputIds };
  return prisma.generatedOutput.findMany({
    where,
    include: {
      approvals: {
        where: { nextStatus: { in: [...approvedOutputStatuses] } },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { reviewedAt: "desc" }
  }) as Promise<ApprovedGeneratedOutput[]>;
}

async function resolveFhirSourceOutput(input: {
  encounterId: string;
  exportKind: "referral" | "teleconsult";
  sourceOutputId?: string;
}) {
  const outputType = input.exportKind === "referral" ? "referral_summary" : "teleconsult_summary";
  const output = await prisma.generatedOutput.findFirst({
    where: {
      id: input.sourceOutputId,
      outputType,
      status: { in: [...approvedOutputStatuses] },
      ambientSession: { encounterId: input.encounterId }
    },
    include: {
      approvals: {
        where: { nextStatus: { in: [...approvedOutputStatuses] } },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { reviewedAt: "desc" }
  });
  if (!output) {
    throw new AppError(
      "INVALID_STATE_TRANSITION",
      `An approved or edited ${input.exportKind} summary is required before FHIR export.`,
      409
    );
  }
  if (output.approvals.length === 0) {
    throw new AppError(
      "INVALID_STATE_TRANSITION",
      "Approved source output is missing approval provenance.",
      409
    );
  }
  return output as ApprovedGeneratedOutput;
}

function buildRejectedSources(
  requestedIds: string[] | undefined,
  acceptedOutputs: Array<{ id: string }>
) {
  if (!requestedIds?.length) return [];
  const accepted = new Set(acceptedOutputs.map((output) => output.id));
  return requestedIds
    .filter((id) => !accepted.has(id))
    .map((id) => ({
      sourceOutputId: id,
      reason: "not_found_out_of_scope_or_not_approved"
    }));
}

function extractMemoryFacts(output: ApprovedGeneratedOutput) {
  const content = asRecord(output.canonicalContent ?? output.content);
  const explicitFacts = arrayStrings(content.memoryFacts ?? content.memoryCandidates);
  if (explicitFacts.length) return explicitFacts;

  const factCandidates = [
    content.summary,
    content.text,
    content.content,
    content.referralSummary,
    content.teleconsultSummary,
    content.impression,
    content.assessment,
    content.plan,
    content.recommendation,
    content.recommendations
  ];
  if (Array.isArray(content.findings)) factCandidates.push(...content.findings);
  if (
    content.sections &&
    typeof content.sections === "object" &&
    !Array.isArray(content.sections)
  ) {
    factCandidates.push(...Object.values(content.sections));
  }

  return factCandidates
    .flatMap((candidate) => arrayStrings(candidate))
    .map((candidate) => candidate.replace(/^[-*\d. )]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function memoryProvenance(
  output: ApprovedGeneratedOutput,
  actorId: string,
  encounterId: string,
  dedupeKey: string
) {
  return {
    sourceOutputId: output.id,
    sourceOutputType: output.outputType,
    sourceOutputStatus: output.status,
    approvalIds: output.approvals.map((approval) => approval.id),
    approvalActions: output.approvals.map((approval) => approval.action),
    sourceReferences: output.sourceReferences,
    actorId,
    encounterId,
    ambientSessionId: output.ambientSessionId,
    contentHash: dedupeKey,
    writtenAt: new Date().toISOString()
  };
}

async function assertFhirSafetyGates(encounterId: string) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: {
      pregnancyEpisode: true,
      observations: { where: { type: "gestational_age" } }
    }
  });
  if (!encounter) throw notFound("Encounter");
  const hasGestationalContext =
    encounter.pregnancyEpisode.gestationalAgeWeeks !== null ||
    encounter.pregnancyEpisode.estimatedDueDate !== null ||
    encounter.observations.length > 0;
  if (!hasGestationalContext) {
    throw new AppError(
      "INVALID_STATE_TRANSITION",
      "Gestational age or estimated due date is required before referral or teleconsult FHIR export.",
      409
    );
  }
  const unacknowledgedCritical = await prisma.ruleResult.count({
    where: {
      encounterId,
      severity: "critical",
      blockingLevel: "ack_required",
      status: "active"
    }
  });
  if (unacknowledgedCritical > 0) {
    throw new AppError(
      "INVALID_STATE_TRANSITION",
      "Critical acknowledgement-required rule results must be acknowledged before export.",
      409
    );
  }
}

async function buildFhirBundle(input: {
  exportId: string;
  encounterId: string;
  actorId: string;
  sourceOutput: ApprovedGeneratedOutput;
  exportKind: "referral" | "teleconsult";
  destinationLabel?: string;
  generatedAt: Date;
}) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: input.encounterId },
    include: {
      patient: true,
      pregnancyEpisode: true,
      observations: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!encounter) throw notFound("Encounter");
  const actor = await prisma.user.findUnique({ where: { id: input.actorId } });
  if (!actor) throw notFound("User");

  const ids = {
    composition: randomUUID(),
    patient: randomUUID(),
    encounter: randomUUID(),
    practitioner: randomUUID(),
    serviceRequest: randomUUID(),
    provenance: randomUUID(),
    observations: encounter.observations.map(() => randomUUID())
  };
  const refs = {
    composition: `urn:uuid:${ids.composition}`,
    patient: `urn:uuid:${ids.patient}`,
    encounter: `urn:uuid:${ids.encounter}`,
    practitioner: `urn:uuid:${ids.practitioner}`,
    serviceRequest: `urn:uuid:${ids.serviceRequest}`,
    provenance: `urn:uuid:${ids.provenance}`
  };
  const sourceText = contentText(input.sourceOutput.canonicalContent ?? input.sourceOutput.content);
  const title =
    input.exportKind === "referral"
      ? "Matria ANC Referral Summary"
      : "Matria ANC Teleconsult Summary";
  const observationEntries = encounter.observations.map((observation, index) => ({
    fullUrl: `urn:uuid:${ids.observations[index]}`,
    resource: {
      resourceType: "Observation",
      id: ids.observations[index],
      status: "final",
      code: { text: observation.type },
      subject: { reference: refs.patient },
      encounter: { reference: refs.encounter },
      effectiveDateTime: observation.createdAt.toISOString(),
      valueString: JSON.stringify(observation.value),
      note: [{ text: `Verification status: ${observation.verificationStatus}` }]
    }
  }));

  const composition = {
    resourceType: "Composition",
    id: ids.composition,
    status: "final",
    type: { text: title },
    subject: { reference: refs.patient },
    encounter: { reference: refs.encounter },
    date: input.generatedAt.toISOString(),
    author: [{ reference: refs.practitioner }],
    title,
    attester: [
      {
        mode: "professional",
        time: input.sourceOutput.reviewedAt?.toISOString() ?? input.generatedAt.toISOString(),
        party: { reference: refs.practitioner }
      }
    ],
    section: [
      {
        title: title,
        text: { status: "generated", div: narrativeDiv(sourceText) },
        entry: [
          { reference: refs.serviceRequest },
          ...observationEntries.map((entry) => ({ reference: entry.fullUrl }))
        ]
      }
    ]
  };

  const bundle = {
    resourceType: "Bundle",
    id: input.exportId,
    type: "document",
    identifier: {
      system: "https://matriacare.site/fhir-exports",
      value: input.exportId
    },
    timestamp: input.generatedAt.toISOString(),
    entry: [
      { fullUrl: refs.composition, resource: composition },
      {
        fullUrl: refs.patient,
        resource: {
          resourceType: "Patient",
          id: ids.patient,
          identifier: [
            {
              system: "https://matriacare.site/hospital-number",
              value: encounter.patient.hospitalNumber
            }
          ],
          name: [{ text: encounter.patient.fullName }],
          birthDate: encounter.patient.dateOfBirth?.toISOString().slice(0, 10)
        }
      },
      {
        fullUrl: refs.encounter,
        resource: {
          resourceType: "Encounter",
          id: ids.encounter,
          status: encounterStatusToFhir(encounter.status),
          class: {
            system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            code: "AMB",
            display: "ambulatory"
          },
          subject: { reference: refs.patient },
          period: { start: encounter.createdAt.toISOString() },
          serviceProvider: encounter.facilityName ? { display: encounter.facilityName } : undefined
        }
      },
      {
        fullUrl: refs.practitioner,
        resource: {
          resourceType: "Practitioner",
          id: ids.practitioner,
          name: [{ text: actor.fullName }],
          telecom: [{ system: "email", value: actor.email }]
        }
      },
      ...observationEntries,
      {
        fullUrl: refs.serviceRequest,
        resource: {
          resourceType: "ServiceRequest",
          id: ids.serviceRequest,
          status: "draft",
          intent: "proposal",
          category: [{ text: input.exportKind }],
          priority: "routine",
          code: {
            text:
              input.exportKind === "referral" ? "Antenatal referral" : "Antenatal teleconsultation"
          },
          subject: { reference: refs.patient },
          encounter: { reference: refs.encounter },
          authoredOn: input.generatedAt.toISOString(),
          requester: { reference: refs.practitioner },
          performer: input.destinationLabel ? [{ display: input.destinationLabel }] : undefined,
          reasonCode: [{ text: sourceText.slice(0, 240) }],
          supportingInfo: observationEntries.map((entry) => ({ reference: entry.fullUrl })),
          note: [{ text: sourceText }]
        }
      },
      {
        fullUrl: refs.provenance,
        resource: {
          resourceType: "Provenance",
          id: ids.provenance,
          target: [{ reference: refs.composition }, { reference: refs.serviceRequest }],
          recorded: input.generatedAt.toISOString(),
          activity: { text: "Matria clinician-approved FHIR export generation" },
          agent: [
            {
              type: { text: "approver" },
              who: { reference: refs.practitioner },
              onBehalfOf: encounter.facilityName ? { display: encounter.facilityName } : undefined
            }
          ],
          entity: [
            {
              role: "source",
              what: {
                identifier: {
                  system: "https://matriacare.site/generated-outputs",
                  value: input.sourceOutput.id
                },
                display: input.sourceOutput.title
              }
            }
          ]
        }
      }
    ]
  };
  return stripUndefined(bundle);
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  return { text: typeof value === "string" ? value : JSON.stringify(value ?? "") };
}

function arrayStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => arrayStrings(item));
  if (typeof value === "string") return splitSentences(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["content", "text", "summary", "label", "title"]) {
      if (typeof record[key] === "string") return splitSentences(record[key]);
    }
  }
  return [];
}

function splitSentences(value: string) {
  return value
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8)
    .slice(0, 10);
}

function normalizeFact(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function hashText(value: string) {
  return createHash("sha256").update(value.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex");
}

function contentText(value: Prisma.JsonValue | null | undefined) {
  const facts = arrayStrings(value);
  if (facts.length) return facts.join(" ");
  return JSON.stringify(value ?? {});
}

function narrativeDiv(text: string) {
  return `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escapeHtml(text)}</p></div>`;
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function encounterStatusToFhir(status: string) {
  if (status === "draft") return "planned";
  if (status === "active" || status === "reviewing") return "in-progress";
  return "finished";
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, stripUndefined(entryValue)])
    ) as T;
  }
  return value;
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
