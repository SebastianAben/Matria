import type { ClinicalFileKind } from "@matria/shared";
import { AppError } from "../http/errors.js";
import { env } from "../config/env.js";

const allowedMimeTypes: Record<ClinicalFileKind, Set<string>> = {
  audio: new Set(["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/webm"]),
  image: new Set(["image/jpeg", "image/png", "image/webp"]),
  document: new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  ultrasound: new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"])
};

export function assertAllowedClinicalFile(input: {
  kind: ClinicalFileKind;
  mimeType: string;
  sizeBytes: number;
}) {
  if (input.sizeBytes <= 0) {
    throw new AppError("VALIDATION_FAILED", "Uploaded clinical file is empty.", 400);
  }
  if (input.sizeBytes > env.CLINICAL_FILE_MAX_BYTES) {
    throw new AppError("VALIDATION_FAILED", "Uploaded clinical file exceeds the size limit.", 400);
  }
  if (!allowedMimeTypes[input.kind].has(input.mimeType)) {
    throw new AppError("VALIDATION_FAILED", "Clinical file MIME type is not allowed.", 400, {
      kind: input.kind,
      mimeType: input.mimeType
    });
  }
}

export function isImageMimeType(mimeType: string) {
  return mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp";
}

export function isVideoMimeType(mimeType: string) {
  return mimeType === "video/mp4" || mimeType === "video/quicktime";
}
