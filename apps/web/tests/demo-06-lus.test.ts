import { describe, expect, it } from "vitest";
import {
  baselineHighlights,
  baselineNote,
  baselineObservations,
  baselineRecommendations,
  baselineRules,
  baselineSummary,
  baselineTranscript,
  demoEndSeconds,
  demoPatient06,
  demoPregnancy06,
  demoTimeline
} from "../lib/demo-06-lus";

describe("06-LUS demo timeline", () => {
  it("starts from a populated mid-consultation baseline for CSV patient 06", () => {
    expect(demoPatient06.hospitalNumber).toBe("DEMO-06-LUS");
    expect(demoPregnancy06.gestationalAgeWeeks).toBe(20);
    expect(baselineTranscript.length).toBeGreaterThanOrEqual(3);
    expect(baselineObservations.map((item) => item.value)).toContain("69 kg, 168 cm, BMI 24.4");
    expect(baselineRules.map((item) => item.rule)).toEqual(
      expect.arrayContaining(["Advanced maternal age", "Urine result missing"])
    );
    expect(baselineHighlights.length).toBeGreaterThanOrEqual(3);
    expect(baselineRecommendations.length).toBeGreaterThanOrEqual(2);
    expect(baselineSummary).toContain("urine/protein result still missing");
    expect(baselineNote).toContain("Continue warning-sign screen");
  });

  it("unlocks events in increasing order inside the 42-second window", () => {
    const unlockTimes = demoTimeline.map((event) => event.at);
    expect(unlockTimes).toEqual([...unlockTimes].sort((a, b) => a - b));
    expect(demoTimeline[0]).toEqual(expect.objectContaining({ at: 8, kind: "transcript" }));
    expect(Math.max(...unlockTimes)).toBeLessThanOrEqual(demoEndSeconds);
    expect(demoEndSeconds).toBe(42);
  });

  it("pauses with counseling covered and urine follow-up still open", () => {
    const finalRecommendations = demoTimeline.filter((event) => event.kind === "recommendation");
    expect(finalRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recommendation: expect.objectContaining({
            id: "warning-screen",
            status: "Done",
            result: "Counseling documented"
          })
        }),
        expect.objectContaining({
          recommendation: expect.objectContaining({
            id: "urine-check",
            priority: "High",
            status: "Open"
          })
        })
      ])
    );
    const finalSummary = [...demoTimeline].reverse().find((event) => event.kind === "summary");
    expect(finalSummary).toEqual(
      expect.objectContaining({
        summary: expect.stringContaining("the consultation is still in progress")
      })
    );
  });
});
