#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const DATASET_ID = "yrzzw9m6kk";
const DATASET_VERSION = "2";
const EXPECTED_SHA256 = "627076751f7bebc20068d98ac8609f8b7d9c7927b9480d7f9fb818ad8a171479";
const EXPECTED_SIZE = 910_379_316;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evalRoot = path.resolve(__dirname, "..");
const rawDir = path.join(evalRoot, ".data", "raw");
const metadataPath = path.join(rawDir, "mendeley-yrzzw9m6kk-v2.json");
const zipPath = path.join(rawDir, "yrzzw9m6kk-2.zip");
const downloadUrl = `https://data.mendeley.com/public-api/zip/${DATASET_ID}/download/${DATASET_VERSION}`;

async function main() {
  await mkdir(rawDir, { recursive: true });
  const zipInfo = await fetchZipInfo();
  await writeFile(metadataPath, `${JSON.stringify(zipInfo, null, 2)}\n`);

  if (await existingZipIsValid(zipPath)) {
    console.log(`Dataset ZIP already exists and matches expected SHA-256: ${zipPath}`);
    return;
  }

  console.log(`Downloading ${zipInfo.downloadUrl}`);
  console.log(`Expected size: ${zipInfo.size ?? EXPECTED_SIZE} bytes`);
  await downloadFile(zipInfo.downloadUrl, zipPath);

  const actualHash = await sha256File(zipPath);
  if (actualHash !== (zipInfo.sha256_hash ?? EXPECTED_SHA256)) {
    throw new Error(
      `Downloaded ZIP hash mismatch. Expected ${zipInfo.sha256_hash ?? EXPECTED_SHA256}, got ${actualHash}.`
    );
  }
  console.log(`Downloaded dataset ZIP: ${zipPath}`);
}

async function fetchZipInfo() {
  const url = `https://data.mendeley.com/public-api/zip/${DATASET_ID}/${DATASET_VERSION}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Matria-MedGemma-Eval/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Mendeley ZIP API failed with ${response.status} ${response.statusText}.`);
  }
  const body = await response.json();
  if (!body.url || body.status !== "FINISH") {
    throw new Error(`Mendeley ZIP is not ready: ${JSON.stringify(body)}`);
  }
  return { ...body, metadataUrl: body.url, downloadUrl };
}

async function existingZipIsValid(filePath) {
  try {
    const info = await stat(filePath);
    if (info.size !== EXPECTED_SIZE) return false;
    const actualHash = await sha256File(filePath);
    return actualHash === EXPECTED_SHA256;
  } catch {
    return false;
  }
}

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Matria-MedGemma-Eval/1.0"
    }
  });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed with ${response.status} ${response.statusText}.`);
  }

  const total = Number(response.headers.get("content-length") ?? EXPECTED_SIZE);
  let downloaded = 0;
  let lastLog = Date.now();
  const progress = new TransformProgress((chunkLength) => {
    downloaded += chunkLength;
    const now = Date.now();
    if (now - lastLog > 5000) {
      const percent = total ? ((downloaded / total) * 100).toFixed(1) : "unknown";
      console.log(`Downloaded ${downloaded} bytes (${percent}%).`);
      lastLog = now;
    }
  });

  await pipeline(Readable.fromWeb(response.body), progress, createWriteStream(destination));
}

class TransformProgress extends Transform {
  constructor(onChunk) {
    super();
    this.onChunk = onChunk;
  }

  _transform(chunk, _encoding, callback) {
    this.onChunk(chunk.length);
    callback(null, chunk);
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
