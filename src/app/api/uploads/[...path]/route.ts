import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves images uploaded from the admin panel at runtime.
//
// Why this exists: `next start` only serves the files that were inside
// /public when the project was BUILT. A product photo uploaded afterwards is
// written to public/images/uploads/ fine, but would 404 (broken image) in
// production. next.config.ts rewrites /images/uploads/* here as a fallback —
// only when Next didn't find the file itself — so the stored paths in the
// database don't need to change.

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  // Uploads are flat files named <timestamp>-<random>.<ext>: refuse anything else
  // (sub-folders, "..", odd characters).
  const name = segments.length === 1 ? segments[0] : "";
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type || !/^[\w.-]+$/.test(name) || name.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(path.join(process.cwd(), "public", "images", "uploads", name));
    return new Response(new Uint8Array(file), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
