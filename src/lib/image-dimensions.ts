import fs from "node:fs";
import path from "node:path";

/**
 * Reads a PNG/JPEG's real pixel width & height straight from its file
 * header — no image-processing library needed, no full decode. Used so
 * hero/banner images can render at their true aspect ratio (spec: show
 * the whole photo, not a cropped/cover'd slice of it) instead of being
 * forced into a fixed-height band.
 *
 * Returns null if the file is missing or not a format we recognize;
 * callers should fall back to a sane default aspect ratio in that case.
 */
export function getImageDimensions(relativePublicPath: string): { width: number; height: number } | null {
  try {
    const filePath = path.join(process.cwd(), "public", relativePublicPath);
    const fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(32);
    fs.readSync(fd, header, 0, 32, 0);
    fs.closeSync(fd);

    // PNG: signature, then IHDR chunk with width/height as big-endian u32 at bytes 16/20.
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
      return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
    }

    // JPEG: walk the marker segments looking for an SOFn frame, which
    // encodes height then width as big-endian u16 five bytes into the segment.
    if (header[0] === 0xff && header[1] === 0xd8) {
      const full = fs.readFileSync(filePath);
      let offset = 2;
      while (offset < full.length - 9) {
        if (full[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = full[offset + 1];
        const isSOF =
          marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSOF) {
          const height = full.readUInt16BE(offset + 5);
          const width = full.readUInt16BE(offset + 7);
          return { width, height };
        }
        const segmentLength = full.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }

    return null;
  } catch {
    return null;
  }
}
