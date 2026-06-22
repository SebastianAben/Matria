import { GoogleGenAI } from "@google/genai";
import { medicalEvidenceFindingSchema } from "@matria/shared";
import type { z } from "zod";
import { env } from "../config/env.js";

export type MedicalEvidenceFindingPayload = z.infer<typeof medicalEvidenceFindingSchema>;

export type EvidenceAttachment = {
  id: string;
  label: string;
  mimeType: string;
  bytes: Buffer;
};

export type MedicalEvidenceProviderInput = {
  handoffId: string;
  taskType: string;
  exactQuestion: string;
  clinicalContext: unknown;
  safetyInstructions: string;
  attachments: EvidenceAttachment[];
};

export type MedicalEvidenceProviderResult = {
  text: string;
  parsed: MedicalEvidenceFindingPayload;
  responseMetadata?: Record<string, unknown>;
};

export interface MedicalEvidenceProviderClient {
  name: "mock" | "gemini_flash" | "ollama_medgemma";
  model: string;
  analyze(input: MedicalEvidenceProviderInput): Promise<MedicalEvidenceProviderResult>;
}

export function createMedicalEvidenceProvider(): MedicalEvidenceProviderClient {
  if (env.MEDICAL_EVIDENCE_PROVIDER === "gemini_flash") return new GeminiFlashEvidenceProvider();
  if (env.MEDICAL_EVIDENCE_PROVIDER === "ollama_medgemma") {
    return new OllamaMedGemmaEvidenceProvider();
  }
  return new MockEvidenceProvider();
}

class MockEvidenceProvider implements MedicalEvidenceProviderClient {
  public readonly name = "mock" as const;
  public readonly model = "mock-medical-evidence";

  async analyze(input: MedicalEvidenceProviderInput): Promise<MedicalEvidenceProviderResult> {
    const parsed: MedicalEvidenceFindingPayload = {
      findings: [
        `Mock evidence for ${input.taskType}: ${input.exactQuestion}`,
        input.attachments.length
          ? `Reviewed ${input.attachments.length} attachment reference(s).`
          : "No attachment bytes were available for model review."
      ],
      extractedValues:
        input.taskType === "lab_value_extraction"
          ? [
              {
                label: "mock_value",
                value: "requires clinician verification",
                confidence: 0.42
              }
            ]
          : [],
      frameReferences: input.attachments.map((attachment) => attachment.id),
      sourceEvidence: input.attachments.map((attachment) => attachment.label),
      confidence: input.attachments.length ? 0.62 : 0.28,
      uncertaintyReasons: input.attachments.length ? [] : ["No image or document attachment."],
      qualityLimitations: ["Mock provider output is deterministic test evidence only."],
      clinicianReviewRequired: true
    };
    const text = JSON.stringify(parsed);
    return { text, parsed, responseMetadata: { mock: true } };
  }
}

class GeminiFlashEvidenceProvider implements MedicalEvidenceProviderClient {
  public readonly name = "gemini_flash" as const;
  public readonly model = env.MEDICAL_EVIDENCE_MODEL;
  private readonly client = new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION
  });

  async analyze(input: MedicalEvidenceProviderInput): Promise<MedicalEvidenceProviderResult> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPrompt(input)
            },
            ...input.attachments.map((attachment) => ({
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.bytes.toString("base64")
              }
            }))
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text ?? "";
    return {
      text,
      parsed: parseEvidenceResponse(text),
      responseMetadata: { provider: this.name, model: this.model }
    };
  }
}

class OllamaMedGemmaEvidenceProvider implements MedicalEvidenceProviderClient {
  public readonly name = "ollama_medgemma" as const;
  public readonly model = env.OLLAMA_MEDGEMMA_MODEL;

  async analyze(input: MedicalEvidenceProviderInput): Promise<MedicalEvidenceProviderResult> {
    const imageAttachments = input.attachments.filter((attachment) =>
      attachment.mimeType.startsWith("image/")
    );
    const response = await fetch(new URL("/api/chat", env.OLLAMA_BASE_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: "json",
        messages: [
          {
            role: "user",
            content: buildPrompt(input),
            images: imageAttachments.map((attachment) => attachment.bytes.toString("base64"))
          }
        ]
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama MedGemma request failed with status ${response.status}.`);
    }
    const body = (await response.json()) as { message?: { content?: string }; response?: string };
    const text = body.message?.content ?? body.response ?? "";
    return {
      text,
      parsed: parseEvidenceResponse(text),
      responseMetadata: {
        provider: this.name,
        model: this.model,
        attachmentCount: imageAttachments.length
      }
    };
  }
}

function buildPrompt(input: MedicalEvidenceProviderInput) {
  return [
    "You are Matria's clinical media and document evidence tool.",
    input.safetyInstructions,
    "Return only JSON with keys: findings, extractedValues, frameReferences, sourceEvidence, confidence, uncertaintyReasons, qualityLimitations, clinicianReviewRequired.",
    "Set clinicianReviewRequired to true. Do not diagnose, prescribe, or make final triage decisions.",
    `Task type: ${input.taskType}`,
    `Question: ${input.exactQuestion}`,
    `Attachment references: ${input.attachments.map((attachment) => attachment.id).join(", ") || "none"}`,
    "Clinical context:",
    JSON.stringify(input.clinicalContext)
  ].join("\n\n");
}

function parseEvidenceResponse(text: string): MedicalEvidenceFindingPayload {
  return medicalEvidenceFindingSchema.parse(JSON.parse(text));
}
