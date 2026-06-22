import type {
  AmbientSessionStatus,
  ConsentMode,
  ConsentStatus,
  EncounterStatus,
  FhirExportKind,
  FhirExportStatus,
  GeneratedOutputStatus,
  GeneratedOutputType,
  ObservationType,
  ObservationVerificationStatus,
  PermissionKey,
  RoleKey
} from "@matria/shared";
import { apiRequest } from "./api";

export type { ConsentMode, ConsentStatus, FhirExportKind, FhirExportStatus, PermissionKey, RoleKey };

export type UserSession = {
  id: string;
  email: string;
  fullName: string;
  permissions: PermissionKey[];
};

export type PatientRecord = {
  id: string;
  hospitalNumber: string;
  fullName: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type PregnancyEpisode = {
  id: string;
  patientId: string;
  label: string;
  estimatedDueDate?: string | null;
  gestationalAgeWeeks?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type EncounterRecord = {
  id: string;
  patientId: string;
  pregnancyEpisodeId: string;
  status: EncounterStatus;
  visitType: string;
  facilityName?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: PatientRecord;
  pregnancyEpisode?: PregnancyEpisode;
  createdBy?: { id: string; fullName: string; email: string };
};

export type ConsentRecord = {
  id: string;
  encounterId: string;
  mode: ConsentMode;
  status: ConsentStatus;
  note?: string | null;
  actorId: string;
  createdAt: string;
};

export type StructuredObservation = {
  id: string;
  encounterId: string;
  type: ObservationType;
  value: Record<string, unknown>;
  verificationStatus: ObservationVerificationStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionNote = {
  id: string;
  encounterId: string;
  content: string;
  version: number;
  updatedAt: string;
};

export type TranscriptTurn = {
  id: string;
  speakerLabel: string;
  speakerRoleGuess: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  sttConfidence?: number | null;
  diarizationConfidence?: number | null;
  correctionStatus: string;
  createdAt: string;
};

export type RuleResult = {
  id: string;
  ruleId: string;
  severity: string;
  blockingLevel: string;
  actionType: string;
  evidence: Record<string, unknown>;
  confidence: number;
  suggestedAction: string;
  status: string;
  createdAt: string;
};

export type SummaryRevision = {
  id: string;
  content: string;
  sections?: Record<string, unknown> | null;
  sourceReferences: unknown;
  confidence?: number | null;
  createdAt: string;
};

export type HighlightCard = {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  sourceReferences: unknown;
  confidence: number;
  requiresAcknowledgement: boolean;
  status: string;
  createdAt: string;
};

export type Suggestion = {
  id: string;
  title: string;
  rationale: string;
  priority: string;
  status: string;
  sourceReferences: unknown;
  resultOptions: Array<{ value: string; label: string }>;
  results?: Array<Record<string, unknown>>;
  updatedAt: string;
};

export type EvidenceFinding = {
  id: string;
  provider: string;
  taskType: string;
  findings: unknown;
  extractedValues: unknown;
  confidence?: number | null;
  processingStatus: string;
  clinicianReviewRequired: boolean;
  createdAt: string;
};

export type GeneratedOutput = {
  id: string;
  outputType: GeneratedOutputType;
  title: string;
  content: Record<string, unknown>;
  canonicalContent?: Record<string, unknown> | null;
  status: GeneratedOutputStatus;
  confidence?: number | null;
  sourceReferences: unknown;
  uncertaintyReasons: unknown;
  reviewedAt?: string | null;
  updatedAt: string;
  approvals?: Array<Record<string, unknown>>;
};

export type AmbientSession = {
  id: string;
  encounterId: string;
  status: AmbientSessionStatus;
  provider: string;
  startedAt?: string | null;
  stoppedAt?: string | null;
  failureReason?: string | null;
  transcriptTurns?: TranscriptTurn[];
  summaryRevisions?: SummaryRevision[];
  highlightCards?: HighlightCard[];
  suggestions?: Suggestion[];
  evidenceFindings?: EvidenceFinding[];
  generatedOutputs?: GeneratedOutput[];
  artifactRevisions?: Array<Record<string, unknown>>;
};

export type AuditLog = {
  id: string;
  actorId?: string | null;
  actor?: { id: string; email: string; fullName: string } | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  outcome: "success" | "failure" | "denied";
  requestId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type WorkspaceState = {
  encounter: EncounterRecord & {
    patient: PatientRecord;
    pregnancyEpisode: PregnancyEpisode;
  };
  consentRecords: ConsentRecord[];
  observations: StructuredObservation[];
  sessionNote: SessionNote | null;
  ruleResults: RuleResult[];
  ambientSession: AmbientSession | null;
  clinicalFiles: Array<Record<string, unknown>>;
  recentActivity: AuditLog[];
};

export type AdminRole = {
  id: string;
  key: RoleKey;
  name: string;
  description?: string | null;
  permissions: PermissionKey[];
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: RoleKey[];
  createdAt?: string;
  updatedAt?: string;
};

export type FhirExport = {
  id: string;
  encounterId: string;
  exportKind: FhirExportKind;
  status: FhirExportStatus;
  destinationLabel?: string | null;
  note?: string | null;
  fhirBundle: Record<string, unknown>;
  sourceManifest?: Record<string, unknown> | null;
  generatedAt: string;
};

export async function requireData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiRequest<T>(path, init);
  if (!response.success) {
    throw new Error(response.error.message);
  }
  return response.data;
}

export function hasPermission(session: UserSession | null, permission: PermissionKey) {
  return Boolean(session?.permissions.includes(permission));
}

export function latestConsent(records: ConsentRecord[], mode: ConsentMode) {
  return records.find((record) => record.mode === mode) ?? null;
}

export function consentGranted(records: ConsentRecord[], mode: ConsentMode) {
  return latestConsent(records, mode)?.status === "granted";
}

export function initials(name?: string | null) {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "--";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

export function formatJsonPreview(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function contentText(content?: Record<string, unknown> | null) {
  if (!content) return "";
  const keys = ["summary", "referralSummary", "teleconsultSummary", "note", "body", "text"];
  for (const key of keys) {
    const value = content[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return JSON.stringify(content, null, 2);
}

export function scopedHref(path: string, scope: URLSearchParams | string) {
  const params = typeof scope === "string" ? new URLSearchParams(scope) : scope;
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
