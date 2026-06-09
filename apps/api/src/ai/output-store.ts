import { randomUUID } from 'node:crypto';

import type { ClinicalApproval, GeneratedOutput, PatientMemoryEntry } from '@matria/contracts';

import { HttpError } from '../errors.js';
import type { SynthesisDraft } from './ai-provider.js';

export type OutputStore = {
  createDrafts(encounterId: string, drafts: SynthesisDraft[]): Promise<GeneratedOutput[]>;
  listByEncounter(encounterId: string): Promise<GeneratedOutput[]>;
  get(outputId: string): Promise<GeneratedOutput | undefined>;
  edit(outputId: string, content: string): Promise<GeneratedOutput>;
  approve(
    outputId: string,
    approverUserId: string,
    editedContent?: string,
  ): Promise<GeneratedOutput>;
  reject(outputId: string, approverUserId: string): Promise<GeneratedOutput>;
  listApprovals(): Promise<ClinicalApproval[]>;
};

export type MemoryStore = {
  writeApprovedOutput(input: {
    patientId: string;
    pregnancyEpisodeId: string;
    encounterId: string;
    output: GeneratedOutput;
  }): Promise<PatientMemoryEntry>;
  listByScope(patientId: string, pregnancyEpisodeId: string): Promise<PatientMemoryEntry[]>;
};

export function createInMemoryOutputStore(): OutputStore {
  const outputs = new Map<string, GeneratedOutput>();
  const approvals: ClinicalApproval[] = [];

  function requireOutput(outputId: string) {
    const output = outputs.get(outputId);
    if (!output) {
      throw new HttpError(404, 'generated_output_not_found', 'Generated output was not found.');
    }
    return output;
  }

  function save(output: GeneratedOutput) {
    outputs.set(output.id, output);
    return output;
  }

  return {
    async createDrafts(encounterId, drafts) {
      return drafts.map((draft) =>
        save({
          id: randomUUID(),
          encounterId,
          kind: draft.kind,
          status: 'draft',
          content: draft.content,
          preservesRuleResultIds: draft.preservesRuleResultIds,
          uncertaintyNotes: draft.uncertaintyNotes,
          createdAt: new Date().toISOString(),
        }),
      );
    },
    async listByEncounter(encounterId) {
      return [...outputs.values()].filter((output) => output.encounterId === encounterId);
    },
    async get(outputId) {
      return outputs.get(outputId);
    },
    async edit(outputId, content) {
      const output = requireOutput(outputId);
      return save({ ...output, content, status: 'edited' });
    },
    async approve(outputId, approverUserId, editedContent) {
      const output = requireOutput(outputId);
      const approved = save({
        ...output,
        content: editedContent ?? output.content,
        status: 'approved',
      });
      approvals.push({
        id: randomUUID(),
        outputId,
        approverUserId,
        action: editedContent ? 'edited' : 'approved',
        editedContent,
        createdAt: new Date().toISOString(),
      });
      return approved;
    },
    async reject(outputId, approverUserId) {
      const output = requireOutput(outputId);
      const rejected = save({ ...output, status: 'rejected' });
      approvals.push({
        id: randomUUID(),
        outputId,
        approverUserId,
        action: 'rejected',
        createdAt: new Date().toISOString(),
      });
      return rejected;
    },
    async listApprovals() {
      return [...approvals];
    },
  };
}

export function createInMemoryMemoryStore(): MemoryStore {
  const entries: PatientMemoryEntry[] = [];

  return {
    async writeApprovedOutput({ patientId, pregnancyEpisodeId, encounterId, output }) {
      const entry: PatientMemoryEntry = {
        id: randomUUID(),
        patientId,
        pregnancyEpisodeId,
        encounterId,
        sourceOutputId: output.id,
        content: output.content,
        createdAt: new Date().toISOString(),
      };
      entries.push(entry);
      return entry;
    },
    async listByScope(patientId, pregnancyEpisodeId) {
      return entries.filter(
        (entry) => entry.patientId === patientId && entry.pregnancyEpisodeId === pregnancyEpisodeId,
      );
    },
  };
}
