import type { PermissionKey, RoleKey } from "@matria/shared";
import { permissionKeys, roleKeys } from "@matria/shared";

const allClinicalPermissions: PermissionKey[] = [
  "patient:read",
  "patient:write",
  "pregnancy_episode:write",
  "encounter:read",
  "encounter:write",
  "consent:write",
  "clinical_file:write",
  "observation:write",
  "session_note:write",
  "ambient_session:start",
  "audio:process",
  "transcript:correct",
  "ai:synthesis",
  "suggestion:resolve"
];

export const roleDescriptions: Record<RoleKey, string> = {
  clinician:
    "Creates ANC encounters, reviews AI outputs, resolves suggestions, and approves drafts.",
  obgyn_specialist:
    "Reviews escalated cases, media evidence, referrals, and teleconsult summaries.",
  nurse_midwife: "Captures intake, consent, vitals, files, session context, and draft ANC data.",
  lab_staff: "Uploads and verifies lab-related files and extracted values.",
  radiology_sonographer: "Uploads ultrasound media and validates media metadata.",
  hospital_admin: "Manages users, roles, permissions, facilities, and configuration.",
  auditor: "Reads audit logs and compliance reports without mutating clinical content.",
  it_operator: "Manages operational health without clinical approval authority."
};

export const defaultRolePermissions: Record<RoleKey, PermissionKey[]> = {
  clinician: [...allClinicalPermissions, "output:approve", "fhir:export"],
  obgyn_specialist: [
    "patient:read",
    "encounter:read",
    "session_note:write",
    "suggestion:resolve",
    "output:approve",
    "fhir:export"
  ],
  nurse_midwife: [
    "patient:read",
    "patient:write",
    "pregnancy_episode:write",
    "encounter:read",
    "encounter:write",
    "consent:write",
    "clinical_file:write",
    "observation:write",
    "session_note:write",
    "ambient_session:start"
  ],
  lab_staff: ["patient:read", "encounter:read", "clinical_file:write", "observation:write"],
  radiology_sonographer: ["patient:read", "encounter:read", "clinical_file:write"],
  hospital_admin: ["admin:users", "admin:roles", "system:config", "audit:read"],
  auditor: ["audit:read"],
  it_operator: ["system:config"]
};

export function assertKnownPermission(permission: string): asserts permission is PermissionKey {
  if (!permissionKeys.includes(permission as PermissionKey)) {
    throw new Error(`Unknown permission: ${permission}`);
  }
}

export { permissionKeys, roleKeys };
