import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../http/errors.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

export type StoredClinicalFile = {
  storageProvider: "local";
  storageKey: string;
  storageUri: string;
  checksumSha256: string;
};

export function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function clinicalFileStorageRoot() {
  return path.isAbsolute(env.CLINICAL_FILE_STORAGE_DIR)
    ? env.CLINICAL_FILE_STORAGE_DIR
    : path.join(projectRoot, env.CLINICAL_FILE_STORAGE_DIR);
}

export async function storeClinicalFile(input: {
  encounterId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<StoredClinicalFile> {
  const extension = safeExtension(input.fileName);
  const storageKey = path.posix.join(input.encounterId, `${randomUUID()}${extension}`);
  const destination = resolveStorageKey(storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, input.buffer, { flag: "wx" });
  return {
    storageProvider: "local",
    storageKey,
    storageUri: `local://clinical-files/${storageKey}`,
    checksumSha256: sha256(input.buffer)
  };
}

export async function readClinicalFile(storageKey: string) {
  return readFile(resolveStorageKey(storageKey));
}

export async function assertStoredFileExists(storageKey: string) {
  await stat(resolveStorageKey(storageKey));
}

export function resolveStorageKey(storageKey: string) {
  if (!storageKey || storageKey.includes("..") || path.isAbsolute(storageKey)) {
    throw new AppError("VALIDATION_FAILED", "Invalid clinical file storage key.", 400);
  }
  const root = clinicalFileStorageRoot();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(root)) {
    throw new AppError("VALIDATION_FAILED", "Invalid clinical file storage key.", 400);
  }
  return resolved;
}

function safeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (!/^\.[a-z0-9]{1,12}$/.test(extension)) return "";
  return extension;
}
