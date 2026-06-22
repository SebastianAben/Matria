import { spawn } from "node:child_process";
import ffmpegStaticPath from "ffmpeg-static";
import { env } from "../config/env.js";

export function resolveFfmpegPath() {
  const bundledPath = ffmpegStaticPath as unknown as string | null;
  return env.FFMPEG_PATH ?? bundledPath ?? undefined;
}

export function runFfmpeg(args: string[], timeoutMs = 30_000) {
  const executable = resolveFfmpegPath();
  if (!executable) {
    return Promise.reject(new Error("FFmpeg executable is not configured."));
  }

  return new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ["ignore", "ignore", "pipe"] });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("FFmpeg timed out while extracting video frames."));
    }, timeoutMs);
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}
