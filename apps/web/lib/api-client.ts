import type {
  AuditLog,
  AssignRolePermissionsRequest,
  AssignUserRolesRequest,
  ClinicalPreflight,
  CreateEncounterRequest,
  CreatePatientRequest,
  CreatePregnancyEpisodeRequest,
  CreateStructuredObservationRequest,
  CreateUserRequest,
  Encounter,
  FhirExport,
  GeneratedOutput,
  Patient,
  Permission,
  PregnancyEpisode,
  Role,
  SessionResponse,
  StructuredObservation,
  UpdateUserRequest,
  User,
} from '@matria/contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000';

type ApiEnvelope<T> = {
  data: T;
};

type ApiErrorBody = {
  code?: string;
  message?: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.message ?? body.code ?? `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const matriaApi = {
  login() {
    return request<SessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@matria.local',
        password: 'development-password',
      }),
    });
  },
  getSession() {
    return request<SessionResponse>('/auth/session');
  },
  listUsers() {
    return request<ApiEnvelope<User[]>>('/admin/users');
  },
  createUser(payload: CreateUserRequest) {
    return request<ApiEnvelope<User>>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateUser(userId: string, payload: UpdateUserRequest) {
    return request<ApiEnvelope<User>>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  assignUserRoles(userId: string, payload: AssignUserRolesRequest) {
    return request<ApiEnvelope<User>>(`/admin/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listRoles() {
    return request<ApiEnvelope<Role[]>>('/admin/roles');
  },
  assignRolePermissions(roleId: string, payload: AssignRolePermissionsRequest) {
    return request<ApiEnvelope<Role>>(`/admin/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listPermissions() {
    return request<ApiEnvelope<Permission[]>>('/admin/permissions');
  },
  listAuditLogs() {
    return request<ApiEnvelope<AuditLog[]>>('/admin/audit-logs');
  },
  createPatient(payload: CreatePatientRequest) {
    return request<ApiEnvelope<Patient>>('/clinical/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createPregnancyEpisode(patientId: string, payload: CreatePregnancyEpisodeRequest) {
    return request<ApiEnvelope<PregnancyEpisode>>(
      `/clinical/patients/${patientId}/pregnancy-episodes`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  createEncounter(payload: CreateEncounterRequest) {
    return request<ApiEnvelope<Encounter>>('/clinical/encounters', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addObservation(encounterId: string, payload: CreateStructuredObservationRequest) {
    return request<ApiEnvelope<StructuredObservation>>(
      `/clinical/encounters/${encounterId}/observations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  runPreflight(encounterId: string) {
    return request<ApiEnvelope<ClinicalPreflight>>(
      `/clinical/encounters/${encounterId}/preflight`,
      {
        method: 'POST',
      },
    );
  },
  requestSynthesis(encounterId: string) {
    return request<ApiEnvelope<GeneratedOutput[]>>(`/ai/encounters/${encounterId}/synthesis`, {
      method: 'POST',
      body: JSON.stringify({
        kinds: ['anc_note', 'risk_synthesis', 'missing_questions', 'referral_summary'],
      }),
    });
  },
  editOutput(outputId: string, content: string) {
    return request<ApiEnvelope<GeneratedOutput>>(`/ai/outputs/${outputId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },
  approveOutput(outputId: string, editedContent?: string) {
    return request<ApiEnvelope<GeneratedOutput>>(`/ai/outputs/${outputId}/approve`, {
      method: 'POST',
      body: JSON.stringify(editedContent ? { editedContent } : {}),
    });
  },
  rejectOutput(outputId: string) {
    return request<ApiEnvelope<GeneratedOutput>>(`/ai/outputs/${outputId}/reject`, {
      method: 'POST',
    });
  },
  exportFhir(outputId: string) {
    return request<ApiEnvelope<FhirExport>>(`/fhir/outputs/${outputId}/export`, {
      method: 'POST',
    });
  },
};
