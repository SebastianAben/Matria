import type { TranscriptClinicalCandidateType, SpeakerRoleGuess } from "@matria/shared";

export type TranscriptCandidateDraft = {
  transcriptTurnId?: string;
  candidateType: TranscriptClinicalCandidateType;
  text: string;
  value?: Record<string, unknown>;
  sourceReferences: Array<{ type: string; id?: string; label?: string }>;
  confidence: number;
};

export type CandidateTurnInput = {
  id: string;
  text: string;
  speakerRoleGuess: SpeakerRoleGuess;
};

type PatternDefinition = {
  type: TranscriptClinicalCandidateType;
  patterns: RegExp[];
  confidence: number;
};

const definitions: PatternDefinition[] = [
  {
    type: "danger_sign_mention",
    patterns: [/bleeding/i, /severe headache/i, /blurred vision/i, /reduced fetal movement/i],
    confidence: 0.72
  },
  {
    type: "symptom_mention",
    patterns: [/nausea/i, /vomit/i, /dizzy/i, /pain/i, /fever/i, /swelling/i],
    confidence: 0.66
  },
  {
    type: "medication_mention",
    patterns: [/tablet/i, /medicine/i, /aspirin/i, /iron/i, /supplement/i],
    confidence: 0.64
  },
  {
    type: "history_mention",
    patterns: [/previous pregnancy/i, /cesarean/i, /miscarriage/i, /hypertension/i, /diabetes/i],
    confidence: 0.65
  },
  {
    type: "clinician_plan",
    patterns: [/we will/i, /please return/i, /refer/i, /follow up/i, /check/i],
    confidence: 0.68
  },
  {
    type: "unresolved_question",
    patterns: [/\?$/, /not sure/i, /unclear/i, /unknown/i],
    confidence: 0.58
  }
];

export function extractTranscriptCandidates(
  turns: CandidateTurnInput[],
  sessionNote?: { id: string; content: string } | null
): TranscriptCandidateDraft[] {
  const drafts: TranscriptCandidateDraft[] = [];
  for (const turn of turns) {
    drafts.push(...extractFromText(turn.text, [{ type: "transcript_turn", id: turn.id }], turn.id));
    const ga = extractGestationalAge(
      turn.text,
      [{ type: "transcript_turn", id: turn.id }],
      turn.id
    );
    if (ga) drafts.push(ga);
  }

  if (sessionNote?.content.trim()) {
    drafts.push(
      ...extractFromText(sessionNote.content, [{ type: "session_note", id: sessionNote.id }])
    );
    const ga = extractGestationalAge(sessionNote.content, [
      { type: "session_note", id: sessionNote.id }
    ]);
    if (ga) drafts.push(ga);
  }

  return dedupeCandidates(drafts);
}

function extractFromText(
  text: string,
  sourceReferences: TranscriptCandidateDraft["sourceReferences"],
  transcriptTurnId?: string
) {
  const matches: TranscriptCandidateDraft[] = [];
  for (const definition of definitions) {
    if (definition.patterns.some((pattern) => pattern.test(text))) {
      matches.push({
        transcriptTurnId,
        candidateType: definition.type,
        text: text.slice(0, 500),
        sourceReferences,
        confidence: definition.confidence
      });
    }
  }
  return matches;
}

function extractGestationalAge(
  text: string,
  sourceReferences: TranscriptCandidateDraft["sourceReferences"],
  transcriptTurnId?: string
): TranscriptCandidateDraft | undefined {
  const match = text.match(/(\d{1,2})\s*(weeks|week|wks|wk)\b/i);
  if (!match) return undefined;
  return {
    transcriptTurnId,
    candidateType: "gestational_age_mention",
    text: match[0],
    value: { weeks: Number(match[1]) },
    sourceReferences,
    confidence: 0.76
  };
}

function dedupeCandidates(candidates: TranscriptCandidateDraft[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.transcriptTurnId ?? "note"}:${candidate.candidateType}:${candidate.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
