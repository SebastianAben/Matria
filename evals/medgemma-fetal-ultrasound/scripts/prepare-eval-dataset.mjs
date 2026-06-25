#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DATASET_ID = "yrzzw9m6kk";
const DATASET_VERSION = "2";
const SEED = "matria-medgemma-1.5-4b-eval-40";
const TARGET_COUNTS = { normal: 14, benign: 13, malignant: 13 };
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".webp"]);
const ARCHIVE_EXTENSIONS = new Set([".rar"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evalRoot = path.resolve(__dirname, "..");
const rawDir = path.join(evalRoot, ".data", "raw");
const extractedDir = path.join(rawDir, "yrzzw9m6kk-2");
const zipPath = path.join(rawDir, "yrzzw9m6kk-2.zip");
const evalImagesDir = path.join(evalRoot, "data", "eval-images");
const manifestPath = path.join(evalRoot, "data", "eval-manifest.json");

async function main() {
  const checkOnly = process.argv.includes("--check");
  if (!(await exists(extractedDir))) {
    if (!(await exists(zipPath))) {
      throw new Error(
        `Dataset ZIP not found at ${zipPath}. Run scripts/download-dataset.mjs or place the downloaded ZIP there.`
      );
    }
    if (checkOnly) {
      throw new Error(`Dataset is not extracted yet: ${extractedDir}`);
    }
    await extractZip();
  }
  await extractNestedArchives(extractedDir);

  const images = await collectImages(extractedDir);
  const selected = [];
  for (const [label, count] of Object.entries(TARGET_COUNTS)) {
    const candidates = images
      .filter((image) => image.label === label)
      .map((image) => ({
        ...image,
        sortKey: createHash("sha256").update(`${SEED}:${image.relativePath}`).digest("hex")
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    if (candidates.length < count) {
      throw new Error(`Need ${count} ${label} images, found ${candidates.length}.`);
    }
    selected.push(...candidates.slice(0, count));
  }

  selected.sort((a, b) => a.label.localeCompare(b.label) || a.relativePath.localeCompare(b.relativePath));
  if (checkOnly) {
    await validateManifest();
    console.log("Eval dataset check passed.");
    return;
  }

  await rm(evalImagesDir, { recursive: true, force: true });
  await mkdir(evalImagesDir, { recursive: true });

  const manifest = [];
  for (const [index, image] of selected.entries()) {
    const evalId = `fetal-us-${String(index + 1).padStart(3, "0")}`;
    const extension = path.extname(image.absolutePath).toLowerCase();
    const destinationRelative = path.join("data", "eval-images", `${evalId}-${image.label}${extension}`);
    const destinationAbsolute = path.join(evalRoot, destinationRelative);
    await copyFile(image.absolutePath, destinationAbsolute);
    const hash = await sha256File(destinationAbsolute);
    manifest.push({
      evalId,
      datasetId: DATASET_ID,
      datasetVersion: DATASET_VERSION,
      sourceRelativePath: image.relativePath,
      imagePath: destinationRelative.split(path.sep).join("/"),
      label: image.label,
      sourceSplit: image.sourceSplit,
      sha256: hash,
      bytes: (await stat(destinationAbsolute)).size
    });
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        dataset: {
          id: DATASET_ID,
          version: DATASET_VERSION,
          doi: "10.17632/yrzzw9m6kk.2",
          license: "CC BY 4.0"
        },
        model: {
          displayName: "MedGemma 1.5 4B",
          ollamaTag: "medgemma1.5:4b"
        },
        seed: SEED,
        targetCounts: TARGET_COUNTS,
        totalImages: manifest.length,
        createdAt: new Date().toISOString(),
        records: manifest
      },
      null,
      2
    )}\n`
  );
  await validateManifest();
  console.log(`Prepared ${manifest.length} eval images at ${evalImagesDir}`);
  console.log(`Wrote manifest to ${manifestPath}`);
}

async function extractZip() {
  await mkdir(extractedDir, { recursive: true });
  await run("unzip", ["-q", "-o", zipPath, "-d", extractedDir]);
}

async function extractNestedArchives(root) {
  const archives = [];
  await walkArchives(root, archives);
  for (const archivePath of archives) {
    const destination = path.join(path.dirname(archivePath), path.basename(archivePath, path.extname(archivePath)));
    const markerPath = path.join(destination, ".extracted-by-prepare-eval-dataset");
    if (await exists(markerPath)) continue;
    await mkdir(destination, { recursive: true });
    await run("bsdtar", ["-xf", archivePath, "-C", destination]);
    await writeFile(markerPath, `${new Date().toISOString()}\n`);
  }
}

async function collectImages(root) {
  const files = [];
  await walk(root, files);
  return files
    .map((absolutePath) => {
      const relativePath = path.relative(root, absolutePath);
      const parts = relativePath.split(path.sep).map((part) => part.toLowerCase());
      const label = parts.find((part) => Object.hasOwn(TARGET_COUNTS, part));
      if (!label) return null;
      const sourceSplit = parts.find((part) => ["train", "training", "test", "testing", "valid", "validation"].includes(part));
      return { absolutePath, relativePath, label, sourceSplit: sourceSplit ?? "unknown" };
    })
    .filter(Boolean);
}

async function walk(dir, files) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolutePath, files);
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }
}

async function walkArchives(dir, archives) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkArchives(absolutePath, archives);
    } else if (ARCHIVE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      archives.push(absolutePath);
    }
  }
}

async function validateManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const records = manifest.records ?? [];
  const counts = records.reduce((accumulator, record) => {
    accumulator[record.label] = (accumulator[record.label] ?? 0) + 1;
    return accumulator;
  }, {});
  if (records.length !== 40) throw new Error(`Manifest has ${records.length} records, expected 40.`);
  for (const [label, count] of Object.entries(TARGET_COUNTS)) {
    if (counts[label] !== count) throw new Error(`Manifest has ${counts[label] ?? 0} ${label}, expected ${count}.`);
  }
  for (const record of records) {
    const filePath = path.join(evalRoot, record.imagePath);
    if (!(await exists(filePath))) throw new Error(`Missing eval image: ${record.imagePath}`);
    const actualHash = await sha256File(filePath);
    if (actualHash !== record.sha256) throw new Error(`Hash mismatch for ${record.imagePath}.`);
  }
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}.`));
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
