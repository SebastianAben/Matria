import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const appRoot = join(new URL("..", import.meta.url).pathname, "app");
const forbiddenPatterns = [
  /components\/demo-data/,
  /from\s+["'][^"']*demo-data["']/,
  /Demo fallback/i,
  /Demo patient/i,
  /Demo output/i,
  /Alya Prameswari/,
  /Dr\. Hana/,
  /RSIA Melati/
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === ".next" || entry === "node_modules") return [];
      return sourceFiles(path);
    }
    return /\.(tsx?|jsx?)$/.test(entry) ? [path] : [];
  });
}

describe("frontend fixture guard", () => {
  it("keeps clinical screens free of local demo fixtures and fallback clinical data", () => {
    const offenders = sourceFiles(appRoot).flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return forbiddenPatterns.some((pattern) => pattern.test(text)) ? [relative(appRoot, file)] : [];
    });

    expect(offenders).toEqual([]);
  });
});
