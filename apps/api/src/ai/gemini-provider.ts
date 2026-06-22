import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import type { geminiSynthesisResponseSchema } from "@matria/shared";
import { env } from "../config/env.js";
import { geminiResponseSchema, parseGeminiSynthesisResponse } from "./gemini-schemas.js";

export type GeminiSynthesisResponse = z.infer<typeof geminiSynthesisResponseSchema>;

export type GeminiProviderInput = {
  contextSnapshotId: string;
  context: unknown;
};

export type GeminiProviderResult = {
  text: string;
  parsed: GeminiSynthesisResponse;
  responseMetadata?: Record<string, unknown>;
};

export interface GeminiProvider {
  name: "mock" | "vertex_ai";
  model: string;
  synthesize(input: GeminiProviderInput): Promise<GeminiProviderResult>;
}

export function createGeminiProvider(): GeminiProvider {
  if (env.GEMINI_PROVIDER === "vertex_ai") return new VertexGeminiProvider();
  return new MockGeminiProvider();
}

class VertexGeminiProvider implements GeminiProvider {
  public readonly name = "vertex_ai" as const;
  public readonly model = env.GEMINI_PRIMARY_MODEL;
  private readonly client = new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION
  });

  async synthesize(input: GeminiProviderInput): Promise<GeminiProviderResult> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You are Matria's ambient ANC decision-support orchestrator.",
                "Return only validated JSON following the provided response schema.",
                "Preserve deterministic rule hits, uncertainty, source references, and clinician authority.",
                "Do not diagnose, prescribe, make final triage decisions, approve outputs, write memory, or export FHIR.",
                JSON.stringify(input.context)
              ].join("\n\n")
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema
      }
    });
    const text = response.text ?? "";
    return {
      text,
      parsed: parseGeminiSynthesisResponse(text),
      responseMetadata: {
        model: this.model,
        provider: this.name
      }
    };
  }
}

class MockGeminiProvider implements GeminiProvider {
  public readonly name = "mock" as const;
  public readonly model = env.GEMINI_PRIMARY_MODEL;

  async synthesize(input: GeminiProviderInput): Promise<GeminiProviderResult> {
    const context = input.context as {
      transcriptTurns?: Array<{ id: string; text: string }>;
      observations?: Array<{ id: string; type: string }>;
      sessionNote?: { content?: string; version?: number } | null;
      ruleResults?: Array<{ id: string; severity: string; blockingLevel: string }>;
      patientMemory?: Array<{ id: string }>;
    };
    const sourceReferences = buildSourceReferences(context);
    const ruleResultReferences = (context.ruleResults ?? [])
      .filter((rule) => rule.severity === "critical" || rule.blockingLevel === "ack_required")
      .map((rule) => rule.id);
    const uncertaintyReasons =
      sourceReferences.length === 0
        ? ["No transcript or structured observations are available yet."]
        : [];
    const firstRule = ruleResultReferences[0];
    const response: GeminiSynthesisResponse = {
      patches: [
        {
          patchId: `mock-summary-${input.contextSnapshotId}`,
          contextSnapshotId: input.contextSnapshotId,
          artifactType: "summary_update",
          operation: "create",
          content: {
            content: buildSummaryText(context),
            sections: {
              sourceCount: sourceReferences.length,
              sessionNoteVersion: context.sessionNote?.version ?? null
            }
          },
          sourceReferences,
          confidence: sourceReferences.length > 0 ? 0.72 : 0.35,
          uncertaintyReasons,
          ruleResultReferences,
          memoryReferences: (context.patientMemory ?? []).map((memory) => memory.id),
          medGemmaReferences: [],
          clinicianActionRequired: true
        },
        {
          patchId: `mock-highlight-${input.contextSnapshotId}`,
          contextSnapshotId: input.contextSnapshotId,
          artifactType: "highlight_cards",
          operation: "create",
          content: {
            cards: [
              {
                type: firstRule ? "risk" : "uncertainty",
                severity: firstRule ? "critical" : "watch",
                title: firstRule ? "Rule finding needs review" : "Context is still developing",
                body: firstRule
                  ? "A deterministic rule result remains visible for clinician review."
                  : "Continue collecting transcript, observations, and clinician note context.",
                sourceReferences,
                confidence: sourceReferences.length > 0 ? 0.7 : 0.4,
                requiresAcknowledgement: Boolean(firstRule)
              }
            ]
          },
          sourceReferences,
          confidence: 0.7,
          uncertaintyReasons,
          ruleResultReferences,
          memoryReferences: [],
          medGemmaReferences: [],
          clinicianActionRequired: true
        },
        {
          patchId: `mock-suggestion-${input.contextSnapshotId}`,
          contextSnapshotId: input.contextSnapshotId,
          artifactType: "suggestions",
          operation: "create",
          content: {
            suggestions: [
              {
                title: firstRule
                  ? "Acknowledge deterministic safety finding"
                  : "Confirm key ANC context",
                rationale: firstRule
                  ? "Critical or acknowledgement-required rule results must remain clinician-visible."
                  : "The synthesis is a draft and should be checked against clinical context.",
                priority: firstRule ? "urgent" : "medium",
                sourceReferences,
                resultOptions: [
                  { value: "reviewed", label: "Reviewed" },
                  { value: "follow_up_needed", label: "Follow-up needed" }
                ],
                freeTextAllowed: true,
                clinicianActionRequired: true
              }
            ]
          },
          sourceReferences,
          confidence: 0.68,
          uncertaintyReasons,
          ruleResultReferences,
          memoryReferences: [],
          medGemmaReferences: [],
          clinicianActionRequired: true
        }
      ],
      safetyNotes: ["Mock synthesis output is a clinician-review draft."]
    };
    const text = JSON.stringify(response);
    return { text, parsed: parseGeminiSynthesisResponse(text), responseMetadata: { mock: true } };
  }
}

function buildSourceReferences(context: {
  transcriptTurns?: Array<{ id: string }>;
  observations?: Array<{ id: string }>;
  sessionNote?: { content?: string } | null;
}) {
  const references = [
    ...(context.transcriptTurns ?? []).slice(-3).map((turn) => `TranscriptTurn:${turn.id}`),
    ...(context.observations ?? [])
      .slice(0, 3)
      .map((observation) => `StructuredObservation:${observation.id}`)
  ];
  if (context.sessionNote?.content) references.push("SessionNote:current");
  return references;
}

function buildSummaryText(context: {
  transcriptTurns?: Array<{ text: string }>;
  observations?: Array<{ type: string }>;
  sessionNote?: { content?: string } | null;
}) {
  const latestTurn = context.transcriptTurns?.at(-1)?.text;
  const observationTypes = [
    ...new Set((context.observations ?? []).map((observation) => observation.type))
  ];
  const pieces = [
    latestTurn
      ? `Latest transcript context: ${latestTurn}`
      : "No transcript context has been captured yet.",
    observationTypes.length
      ? `Structured observations present: ${observationTypes.join(", ")}.`
      : "No structured observations are present yet.",
    context.sessionNote?.content
      ? "Clinician session note is included in this draft."
      : "No clinician note content yet."
  ];
  return pieces.join(" ");
}
