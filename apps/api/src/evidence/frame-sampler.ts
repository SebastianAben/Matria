import type { Prisma } from "@prisma/client";
import sharp from "sharp";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { frameSampleCreateSchema } from "@matria/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { AppError, notFound } from "../http/errors.js";
import { isImageMimeType, isVideoMimeType } from "./file-validation.js";
import { runFfmpeg } from "./ffmpeg.js";
import { readClinicalFile, sha256, storeClinicalFile } from "./storage.js";

export async function sampleClinicalFileFrames(clinicalFileId: string, input: unknown = {}) {
  const request = frameSampleCreateSchema.parse(input);
  const clinicalFile = await prisma.clinicalFile.findUnique({
    where: { id: clinicalFileId },
    include: { encounter: { include: { ambientSessions: { orderBy: { createdAt: "desc" } } } } }
  });
  if (!clinicalFile) throw notFound("Clinical file");

  const ambientSessionId =
    request.ambientSessionId ?? clinicalFile.encounter.ambientSessions[0]?.id ?? null;

  if (isImageMimeType(clinicalFile.mimeType)) {
    return sampleStillImage({ clinicalFile, ambientSessionId });
  }

  if (isVideoMimeType(clinicalFile.mimeType)) {
    return sampleVideoFileFrames({
      clinicalFile,
      ambientSessionId,
      intervalSeconds: request.intervalSeconds ?? env.MEDIA_FRAME_SAMPLE_INTERVAL_SECONDS
    });
  }

  throw new AppError(
    "VALIDATION_FAILED",
    "Frame sampling is only available for image and video clinical files.",
    400
  );
}

async function sampleStillImage(input: {
  clinicalFile: {
    id: string;
    encounterId: string;
    fileName: string;
    mimeType: string;
    storageKey: string | null;
  };
  ambientSessionId: string | null;
}) {
  if (!input.clinicalFile.storageKey) {
    throw new AppError("VALIDATION_FAILED", "Clinical file does not have stored file bytes.", 400);
  }

  const existing = await prisma.medicalEvidenceFrameSample.findFirst({
    where: { clinicalFileId: input.clinicalFile.id, frameIndex: 0, sourceTimestampMs: null }
  });
  if (existing) return [existing];

  const original = await readClinicalFile(input.clinicalFile.storageKey);
  const image = sharp(original).rotate();
  const metadata = await image.metadata();
  const normalized = await image
    .resize({ width: 896, height: 896, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  const stored = await storeClinicalFile({
    encounterId: input.clinicalFile.encounterId,
    fileName: `${input.clinicalFile.fileName}.sample.jpg`,
    buffer: normalized
  });

  const qualityMetadata = {
    source: "still_image",
    originalMimeType: input.clinicalFile.mimeType,
    originalBytes: original.byteLength,
    normalizedBytes: normalized.byteLength,
    originalChecksumSha256: sha256(original),
    imageReadable: true
  };

  const sample = await prisma.medicalEvidenceFrameSample.create({
    data: {
      ambientSessionId: input.ambientSessionId,
      clinicalFileId: input.clinicalFile.id,
      sourceTimestampMs: null,
      frameIndex: 0,
      storageProvider: stored.storageProvider,
      storageKey: stored.storageKey,
      storageUri: stored.storageUri,
      checksumSha256: stored.checksumSha256,
      mimeType: "image/jpeg",
      width: metadata.width,
      height: metadata.height,
      qualityMetadata: qualityMetadata as Prisma.InputJsonValue,
      processingStatus: "sampled"
    }
  });
  return [sample];
}

async function sampleVideoFileFrames(input: {
  clinicalFile: {
    id: string;
    encounterId: string;
    fileName: string;
    mimeType: string;
    storageKey: string | null;
  };
  ambientSessionId: string | null;
  intervalSeconds: number;
}) {
  const existing = await prisma.medicalEvidenceFrameSample.findMany({
    where: { clinicalFileId: input.clinicalFile.id, processingStatus: "sampled" },
    orderBy: [{ frameIndex: "asc" }, { createdAt: "asc" }]
  });
  if (existing.length > 0) return existing;

  if (!input.clinicalFile.storageKey) {
    throw new AppError("VALIDATION_FAILED", "Clinical file does not have stored file bytes.", 400);
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "matria-video-"));
  try {
    const videoBuffer = await readClinicalFile(input.clinicalFile.storageKey);
    const inputPath = path.join(tempRoot, "input-video");
    const framesDir = path.join(tempRoot, "frames");
    await mkdir(framesDir, { recursive: true });
    await writeFile(inputPath, videoBuffer);

    await runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-vf",
      `fps=1/${input.intervalSeconds},scale='min(896,iw)':-2`,
      "-frames:v",
      String(env.MEDIA_FRAME_MAX_SAMPLES),
      "-q:v",
      "3",
      path.join(framesDir, "frame-%04d.jpg")
    ]);

    let frameNames = await readExtractedFrameNames(framesDir);
    if (frameNames.length === 0) {
      await runFfmpeg([
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-vf",
        "scale='min(896,iw)':-2",
        "-frames:v",
        "1",
        "-q:v",
        "3",
        path.join(framesDir, "frame-%04d.jpg")
      ]);
      frameNames = await readExtractedFrameNames(framesDir);
    }
    frameNames = frameNames
      .filter((fileName) => /^frame-\d{4}\.jpg$/.test(fileName))
      .sort()
      .slice(0, env.MEDIA_FRAME_MAX_SAMPLES);
    if (frameNames.length === 0) {
      throw new Error("FFmpeg produced no frames from the uploaded video file.");
    }

    const samples = [];
    for (let index = 0; index < frameNames.length; index += 1) {
      const frameIndex = index;
      const sourceTimestampMs = frameIndex * input.intervalSeconds * 1000;
      const alreadyStored = await prisma.medicalEvidenceFrameSample.findFirst({
        where: { clinicalFileId: input.clinicalFile.id, frameIndex, sourceTimestampMs }
      });
      if (alreadyStored) {
        samples.push(alreadyStored);
        continue;
      }

      const frameBuffer = await readFile(path.join(framesDir, frameNames[index]!));
      const metadata = await sharp(frameBuffer).metadata();
      const stored = await storeClinicalFile({
        encounterId: input.clinicalFile.encounterId,
        fileName: `${input.clinicalFile.fileName}.frame-${String(index + 1).padStart(4, "0")}.jpg`,
        buffer: frameBuffer
      });
      samples.push(
        await prisma.medicalEvidenceFrameSample.create({
          data: {
            ambientSessionId: input.ambientSessionId,
            clinicalFileId: input.clinicalFile.id,
            sourceTimestampMs,
            frameIndex,
            storageProvider: stored.storageProvider,
            storageKey: stored.storageKey,
            storageUri: stored.storageUri,
            checksumSha256: stored.checksumSha256,
            mimeType: "image/jpeg",
            width: metadata.width,
            height: metadata.height,
            qualityMetadata: {
              source: "uploaded_video_file",
              originalMimeType: input.clinicalFile.mimeType,
              targetIntervalSeconds: input.intervalSeconds,
              maxSamples: env.MEDIA_FRAME_MAX_SAMPLES,
              frameFileName: frameNames[index],
              uploadedVideoChecksumSha256: sha256(videoBuffer)
            } as Prisma.InputJsonValue,
            processingStatus: "sampled"
          }
        })
      );
    }
    return samples;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video frame extraction failed.";
    return [
      await createVideoDegradedSample({
        clinicalFileId: input.clinicalFile.id,
        ambientSessionId: input.ambientSessionId,
        mimeType: input.clinicalFile.mimeType,
        intervalSeconds: input.intervalSeconds,
        failureReason: message
      })
    ];
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function readExtractedFrameNames(framesDir: string) {
  return (await readdir(framesDir)).filter((fileName) => /^frame-\d{4}\.jpg$/.test(fileName));
}

async function createVideoDegradedSample(input: {
  clinicalFileId: string;
  ambientSessionId: string | null;
  mimeType: string;
  intervalSeconds: number;
  failureReason: string;
}) {
  const existing = await prisma.medicalEvidenceFrameSample.findFirst({
    where: { clinicalFileId: input.clinicalFileId, frameIndex: 0, sourceTimestampMs: 0 }
  });
  if (existing?.processingStatus === "degraded") return existing;

  return prisma.medicalEvidenceFrameSample.create({
    data: {
      ambientSessionId: input.ambientSessionId,
      clinicalFileId: input.clinicalFileId,
      sourceTimestampMs: 0,
      frameIndex: 0,
      mimeType: "image/jpeg",
      qualityMetadata: {
        source: "video_placeholder",
        originalMimeType: input.mimeType,
        targetIntervalSeconds: input.intervalSeconds
      },
      processingStatus: "degraded",
      failureReason: `Video frame extraction failed for uploaded file: ${input.failureReason}`
    }
  });
}
