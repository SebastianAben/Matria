import type {
  ClinicalApproval,
  Encounter,
  FhirExport,
  GeneratedOutput,
  Patient,
  PregnancyEpisode,
} from '@matria/contracts';

export type FhirDocumentBundle = {
  resourceType: 'Bundle';
  type: 'document';
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: Record<string, unknown>;
  }>;
};

export function formatApprovedOutputAsFhirR4(input: {
  exportId: string;
  encounter: Encounter;
  patient: Patient;
  pregnancyEpisode: PregnancyEpisode;
  output: GeneratedOutput;
  approval: ClinicalApproval;
  generatedAt: string;
}): FhirExport {
  const { approval, encounter, exportId, generatedAt, output, patient, pregnancyEpisode } = input;
  const compositionId = `composition-${exportId}`;
  const patientReference = `Patient/${patient.id}`;
  const encounterReference = `Encounter/${encounter.id}`;
  const documentReference = `DocumentReference/${output.id}`;

  const artifactJson: FhirDocumentBundle = {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: generatedAt,
    entry: [
      {
        fullUrl: `urn:uuid:${compositionId}`,
        resource: {
          resourceType: 'Composition',
          id: compositionId,
          status: 'final',
          type: {
            coding: [
              {
                system: 'http://loinc.org',
                code: output.kind === 'referral_summary' ? '57133-1' : '34133-9',
                display:
                  output.kind === 'referral_summary' ? 'Referral note' : 'Summary of episode note',
              },
            ],
          },
          subject: { reference: patientReference, display: patient.displayName },
          encounter: { reference: encounterReference },
          date: generatedAt,
          author: [{ reference: `Practitioner/${approval.approverUserId}` }],
          title: `Matria ${output.kind.replaceAll('_', ' ')}`,
          section: [
            {
              title: output.kind.replaceAll('_', ' '),
              text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(output.content)}</div>`,
              },
              entry: [{ reference: documentReference }],
            },
          ],
        },
      },
      {
        fullUrl: `urn:uuid:${patient.id}`,
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [
            { system: 'urn:matria:hospital-record-number', value: patient.hospitalRecordNumber },
          ],
          name: [{ text: patient.displayName }],
          birthDate: patient.dateOfBirth,
        },
      },
      {
        fullUrl: `urn:uuid:${encounter.id}`,
        resource: {
          resourceType: 'Encounter',
          id: encounter.id,
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          subject: { reference: patientReference },
          period: { start: encounter.startedAt },
          extension: [
            {
              url: 'urn:matria:pregnancy-episode-id',
              valueString: pregnancyEpisode.id,
            },
          ],
        },
      },
      {
        fullUrl: `urn:uuid:${output.id}`,
        resource: {
          resourceType: 'DocumentReference',
          id: output.id,
          status: 'current',
          docStatus: 'final',
          subject: { reference: patientReference },
          date: generatedAt,
          content: [
            {
              attachment: {
                contentType: 'text/plain',
                data: Buffer.from(output.content, 'utf8').toString('base64'),
                title: output.kind.replaceAll('_', ' '),
              },
            },
          ],
        },
      },
      {
        fullUrl: `urn:uuid:provenance-${exportId}`,
        resource: {
          resourceType: 'Provenance',
          id: `provenance-${exportId}`,
          recorded: generatedAt,
          target: [{ reference: documentReference }],
          agent: [
            {
              type: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
                    code: 'author',
                  },
                ],
              },
              who: { reference: `Practitioner/${approval.approverUserId}` },
            },
          ],
          entity: [
            {
              role: 'source',
              what: { identifier: { system: 'urn:matria:generated-output-id', value: output.id } },
            },
          ],
        },
      },
    ],
  };

  return {
    id: exportId,
    encounterId: encounter.id,
    outputId: output.id,
    approvingClinicianUserId: approval.approverUserId,
    status: 'generated',
    artifactJson,
    generatedAt,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
