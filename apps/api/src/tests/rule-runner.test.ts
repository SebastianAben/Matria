import { describe, expect, it } from "vitest";
import { evaluateRules } from "../rules/rule-runner.js";

describe("rule runner", () => {
  it("returns severe hypertension and missing gestational age as advisory findings", () => {
    const results = evaluateRules({
      pregnancyEpisode: {
        id: "episode-1",
        patientId: "patient-1",
        label: "Current pregnancy",
        estimatedDueDate: null,
        gestationalAgeWeeks: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      observations: [
        {
          id: "obs-1",
          encounterId: "encounter-1",
          type: "vitals",
          value: { bloodPressure: "162/111" },
          verificationStatus: "clinician_entered",
          source: "manual_entry",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      sessionNote: null
    });

    expect(results.map((result) => result.ruleId)).toContain("severe-hypertension-vitals");
    expect(results.find((result) => result.ruleId === "severe-hypertension-vitals")).toMatchObject({
      severity: "critical",
      blockingLevel: "ack_required"
    });
    expect(results.find((result) => result.ruleId === "missing-gestational-age")).toMatchObject({
      blockingLevel: "soft"
    });
  });
});
