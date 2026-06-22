import { describe, expect, it } from "vitest";
import { mapDiarizedWordsToTurns } from "../ambient/diarization.js";

describe("diarization mapper", () => {
  it("groups contiguous two-speaker words into transcript turns", () => {
    const turns = mapDiarizedWordsToTurns({
      provider: "google",
      languageCode: "en-US",
      transcript: "How are you today I have bleeding",
      confidence: 0.9,
      words: [
        { word: "How", speakerTag: 1, startTimeMs: 0, endTimeMs: 200, confidence: 0.9 },
        { word: "are", speakerTag: 1, startTimeMs: 210, endTimeMs: 320, confidence: 0.9 },
        { word: "you", speakerTag: 1, startTimeMs: 330, endTimeMs: 460, confidence: 0.9 },
        { word: "today?", speakerTag: 1, startTimeMs: 470, endTimeMs: 620, confidence: 0.9 },
        { word: "I", speakerTag: 2, startTimeMs: 900, endTimeMs: 1000, confidence: 0.86 },
        { word: "have", speakerTag: 2, startTimeMs: 1010, endTimeMs: 1190, confidence: 0.86 },
        { word: "bleeding", speakerTag: 2, startTimeMs: 1200, endTimeMs: 1500, confidence: 0.86 }
      ]
    });

    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ speakerLabel: "Speaker 1", speakerRoleGuess: "clinician" });
    expect(turns[1]).toMatchObject({ speakerLabel: "Speaker 2", speakerRoleGuess: "patient" });
    expect(turns[1]?.text).toBe("I have bleeding");
  });
});
