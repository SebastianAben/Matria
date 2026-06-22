import { env } from "../config/env.js";
import type { SttProviderResult, SttWord } from "./diarization.js";

export type AudioEventInput = {
  sequence: number;
  mimeType: string;
  durationMs?: number;
  storageUri?: string;
  transcriptText?: string;
  simulateFailure?: boolean;
};

export interface SpeechToTextProvider {
  readonly name: "mock" | "google";
  processAudioEvent(input: AudioEventInput): Promise<SttProviderResult>;
}

export function createSpeechToTextProvider(): SpeechToTextProvider {
  if (env.STT_PROVIDER === "google") return new GoogleSpeechToTextProvider();
  return new MockSpeechToTextProvider();
}

export class MockSpeechToTextProvider implements SpeechToTextProvider {
  readonly name = "mock" as const;

  async processAudioEvent(input: AudioEventInput): Promise<SttProviderResult> {
    if (input.simulateFailure) {
      throw new Error("Mock STT provider failure");
    }
    const transcript = input.transcriptText?.trim() || "Patient reports feeling well today.";
    return {
      provider: this.name,
      languageCode: env.GOOGLE_STT_LANGUAGE_CODE,
      transcript,
      words: mockWordsFromTranscript(transcript),
      confidence: 0.88
    };
  }
}

class GoogleSpeechToTextProvider implements SpeechToTextProvider {
  readonly name = "google" as const;

  async processAudioEvent(input: AudioEventInput): Promise<SttProviderResult> {
    if (!input.storageUri) {
      throw new Error("Google STT provider requires storageUri for this backend ingestion path.");
    }

    const { SpeechClient } = await import("@google-cloud/speech");
    const client = new SpeechClient();
    const [response] = (await (client as any).recognize({
      audio: { uri: input.storageUri },
      config: {
        languageCode: env.GOOGLE_STT_LANGUAGE_CODE,
        model: env.GOOGLE_STT_MODEL,
        diarizationConfig: {
          enableSpeakerDiarization: env.GOOGLE_STT_ENABLE_DIARIZATION,
          minSpeakerCount: env.GOOGLE_STT_SPEAKER_COUNT,
          maxSpeakerCount: env.GOOGLE_STT_SPEAKER_COUNT
        }
      }
    })) as [any];

    const alternatives: any[] = response.results
      ?.map((result: any) => result.alternatives?.[0])
      .filter((alternative: any) => Boolean(alternative));
    const transcript =
      alternatives
        ?.map((alternative: any) => alternative.transcript ?? "")
        .join(" ")
        .trim() ?? "";
    const words: SttWord[] =
      alternatives?.flatMap((alternative: any) => {
        return (alternative.words ?? []).map((word: any): SttWord => {
          const startTimeMs = secondsNanosToMs(word.startTime);
          const endTimeMs = secondsNanosToMs(word.endTime);
          return {
            word: word.word ?? "",
            speakerTag: Number(word.speakerTag ?? 1),
            startTimeMs,
            endTimeMs,
            confidence: word.confidence ?? alternative.confidence ?? undefined
          };
        });
      }) ?? [];

    return {
      provider: this.name,
      languageCode: env.GOOGLE_STT_LANGUAGE_CODE,
      transcript,
      words: words.filter((word) => word.word.trim().length > 0),
      confidence: alternatives?.[0]?.confidence ?? undefined,
      raw: response
    };
  }
}

function mockWordsFromTranscript(transcript: string): SttWord[] {
  const words = transcript
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  return words.map((word, index) => {
    const speakerTag = inferMockSpeakerTag(word, index);
    return {
      word: word.replace(/^(Clinician:|Patient:)/i, ""),
      speakerTag,
      startTimeMs: index * 550,
      endTimeMs: index * 550 + 420,
      confidence: 0.88
    };
  });
}

function inferMockSpeakerTag(word: string, index: number) {
  if (/^Clinician:/i.test(word)) return 1;
  if (/^Patient:/i.test(word)) return 2;
  return Math.floor(index / 12) % 2 === 0 ? 1 : 2;
}

function secondsNanosToMs(value: unknown) {
  if (!value || typeof value !== "object") return 0;
  const record = value as { seconds?: number | string; nanos?: number };
  const seconds =
    typeof record.seconds === "string" ? Number(record.seconds) : (record.seconds ?? 0);
  return Math.round(seconds * 1000 + (record.nanos ?? 0) / 1_000_000);
}
