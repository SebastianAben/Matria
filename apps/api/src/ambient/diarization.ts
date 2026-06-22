import type { SpeakerRoleGuess } from "@matria/shared";

export type SttWord = {
  word: string;
  speakerTag?: number;
  startTimeMs: number;
  endTimeMs: number;
  confidence?: number;
};

export type SttProviderResult = {
  provider: "mock" | "google";
  languageCode: string;
  transcript: string;
  words: SttWord[];
  confidence?: number;
  raw?: unknown;
};

export type TranscriptTurnDraft = {
  speakerLabel: string;
  speakerRoleGuess: SpeakerRoleGuess;
  roleConfidence?: number;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  languageCode: string;
  sttConfidence?: number;
  diarizationConfidence?: number;
};

const MAX_SAME_TURN_GAP_MS = 1400;

export function mapDiarizedWordsToTurns(result: SttProviderResult): TranscriptTurnDraft[] {
  if (result.words.length === 0 && result.transcript.trim()) {
    return [
      {
        speakerLabel: "Speaker 1",
        speakerRoleGuess: "unknown",
        startTimeMs: 0,
        endTimeMs: 0,
        text: result.transcript.trim(),
        languageCode: result.languageCode,
        sttConfidence: result.confidence,
        diarizationConfidence: result.provider === "google" ? 0.7 : 0.5
      }
    ];
  }

  const turns: TranscriptTurnDraft[] = [];
  let current: SttWord[] = [];

  for (const word of result.words) {
    const last = current.at(-1);
    const sameSpeaker = !last || (last.speakerTag ?? 1) === (word.speakerTag ?? 1);
    const closeEnough = !last || word.startTimeMs - last.endTimeMs <= MAX_SAME_TURN_GAP_MS;
    const lastEndedSentence = last ? /[.!?]$/.test(last.word) : false;

    if (current.length > 0 && (!sameSpeaker || !closeEnough || lastEndedSentence)) {
      turns.push(toTurn(current, result));
      current = [];
    }
    current.push(word);
  }

  if (current.length > 0) turns.push(toTurn(current, result));
  return turns;
}

function toTurn(words: SttWord[], result: SttProviderResult): TranscriptTurnDraft {
  const speakerTag = words[0]?.speakerTag ?? 1;
  const confidenceValues = words
    .map((word) => word.confidence)
    .filter((value): value is number => value !== undefined);
  const averageConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length
      : result.confidence;
  return {
    speakerLabel: `Speaker ${speakerTag}`,
    speakerRoleGuess: guessRoleFromSpeakerTag(speakerTag),
    roleConfidence: 0.4,
    startTimeMs: words[0]?.startTimeMs ?? 0,
    endTimeMs: words.at(-1)?.endTimeMs ?? 0,
    text: joinWords(words.map((word) => word.word)),
    languageCode: result.languageCode,
    sttConfidence: averageConfidence,
    diarizationConfidence: result.provider === "google" ? 0.75 : 0.55
  };
}

function guessRoleFromSpeakerTag(speakerTag: number): SpeakerRoleGuess {
  if (speakerTag === 1) return "clinician";
  if (speakerTag === 2) return "patient";
  return "unknown";
}

function joinWords(words: string[]) {
  return words
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
