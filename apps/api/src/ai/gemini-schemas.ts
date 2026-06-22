import { geminiSynthesisResponseSchema } from "@matria/shared";

export const geminiResponseSchema = {
  type: "OBJECT",
  properties: {
    patches: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          patchId: { type: "STRING" },
          contextSnapshotId: { type: "STRING" },
          artifactType: {
            type: "STRING",
            enum: [
              "summary_update",
              "highlight_cards",
              "suggestions",
              "missing_questions",
              "session_note_draft_sections",
              "anc_note_draft",
              "teleconsult_summary_draft",
              "referral_summary_draft",
              "fhir_export_draft_inputs",
              "medgemma_handoff_request",
              "requires_human_review"
            ]
          },
          operation: {
            type: "STRING",
            enum: ["create", "update", "replace", "archive", "no_change"]
          },
          artifactId: { type: "STRING", nullable: true },
          content: { type: "OBJECT" },
          sourceReferences: { type: "ARRAY", items: { type: "STRING" } },
          confidence: { type: "NUMBER", nullable: true },
          uncertaintyReasons: { type: "ARRAY", items: { type: "STRING" } },
          ruleResultReferences: { type: "ARRAY", items: { type: "STRING" } },
          memoryReferences: { type: "ARRAY", items: { type: "STRING" } },
          medGemmaReferences: { type: "ARRAY", items: { type: "STRING" } },
          clinicianActionRequired: { type: "BOOLEAN" }
        },
        required: [
          "patchId",
          "contextSnapshotId",
          "artifactType",
          "operation",
          "content",
          "sourceReferences",
          "uncertaintyReasons",
          "ruleResultReferences",
          "memoryReferences",
          "medGemmaReferences",
          "clinicianActionRequired"
        ],
        propertyOrdering: [
          "patchId",
          "contextSnapshotId",
          "artifactType",
          "operation",
          "artifactId",
          "content",
          "sourceReferences",
          "confidence",
          "uncertaintyReasons",
          "ruleResultReferences",
          "memoryReferences",
          "medGemmaReferences",
          "clinicianActionRequired"
        ]
      }
    },
    safetyNotes: { type: "ARRAY", items: { type: "STRING" } }
  },
  required: ["patches", "safetyNotes"],
  propertyOrdering: ["patches", "safetyNotes"]
};

export function parseGeminiSynthesisResponse(rawText: string) {
  const parsed = JSON.parse(rawText) as unknown;
  return geminiSynthesisResponseSchema.parse(parsed);
}
