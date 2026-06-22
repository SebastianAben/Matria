import type { GeminiSynthesisResponse } from "./gemini-provider.js";

type SnapshotPayload = {
  observations?: unknown[];
  transcriptTurns?: unknown[];
  ruleResults?: Array<{ id: string; severity: string; blockingLevel: string; status: string }>;
};

export function validateGeminiOutput(payload: SnapshotPayload, response: GeminiSynthesisResponse) {
  const activeCriticalRuleIds = (payload.ruleResults ?? [])
    .filter(
      (rule) =>
        rule.status === "active" &&
        (rule.severity === "critical" ||
          rule.blockingLevel === "ack_required" ||
          rule.blockingLevel === "hard")
    )
    .map((rule) => rule.id);
  const weakContext =
    (payload.observations ?? []).length === 0 && (payload.transcriptTurns ?? []).length === 0;

  for (const patch of response.patches) {
    if (patch.operation !== "no_change" && patch.sourceReferences.length === 0) {
      throw new Error(`Patch ${patch.patchId} is missing source references.`);
    }

    for (const ruleId of activeCriticalRuleIds) {
      if (!patch.ruleResultReferences.includes(ruleId)) {
        throw new Error(`Patch ${patch.patchId} omitted active critical rule result ${ruleId}.`);
      }
    }

    if (weakContext && patch.operation !== "no_change" && patch.uncertaintyReasons.length === 0) {
      throw new Error(`Patch ${patch.patchId} must preserve uncertainty for weak context.`);
    }

    if (patch.content.approved === true || patch.content.reviewStatus === "approved") {
      throw new Error(`Patch ${patch.patchId} attempted to mark draft content approved.`);
    }
  }
}
