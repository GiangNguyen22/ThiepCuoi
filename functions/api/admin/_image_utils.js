// Helper utilities for Image Validation & Safety

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES_PER_REQUEST = 10;

/**
 * Sniffs binary magic bytes to detect legitimate raster images only (JPEG, PNG, WebP).
 * Blocks SVGs, HTML, PHP, Executables, Scripts, and any non-raster formats.
 */
export function detectRasterImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP: RIFF .... WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

/**
 * Sanitizes original filename for metadata display (strips paths and unsafe chars)
 */
export function sanitizeFilename(filename) {
  if (typeof filename !== "string") return "unnamed_image";
  const basename = filename.split(/[/\\]/).pop() || "unnamed_image";
  return basename.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 100);
}
