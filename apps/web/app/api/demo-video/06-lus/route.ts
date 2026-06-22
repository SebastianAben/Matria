import { existsSync, statSync, createReadStream } from "node:fs";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";

function resolveVideoPath() {
  const candidates = [
    resolve(process.cwd(), "demo/video/06-lus.mp4"),
    resolve(process.cwd(), "../../demo/video/06-lus.mp4"),
    resolve(process.cwd(), "../../../demo/video/06-lus.mp4")
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? join(process.cwd(), "demo/video/06-lus.mp4");
}

export async function GET(request: Request) {
  const videoPath = resolveVideoPath();
  if (!existsSync(videoPath)) {
    return new Response("Demo video not found.", { status: 404 });
  }

  const { size } = statSync(videoPath);
  const range = request.headers.get("range");
  const headers = {
    "Accept-Ranges": "bytes",
    "Content-Type": "video/mp4",
    "Cache-Control": "public, max-age=3600"
  };

  if (!range) {
    const stream = createReadStream(videoPath);
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        ...headers,
        "Content-Length": String(size)
      }
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    return new Response("Invalid range.", { status: 416, headers });
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return new Response("Range not satisfiable.", {
      status: 416,
      headers: {
        ...headers,
        "Content-Range": `bytes */${size}`
      }
    });
  }

  const chunkSize = end - start + 1;
  const stream = createReadStream(videoPath, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${size}`
    }
  });
}
