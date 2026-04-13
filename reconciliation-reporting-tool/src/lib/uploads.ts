import path from "node:path";
import fs from "node:fs/promises";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export function sanitizeFileName(name: string) {
  const trimmed = name.trim().replaceAll("\\", "_").replaceAll("/", "_");
  return trimmed.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveUploadedFile(params: {
  subdir: string;
  originalName: string;
  bytes: Uint8Array;
}) {
  const safeName = sanitizeFileName(params.originalName || "upload.bin");
  const dir = path.join(UPLOADS_DIR, params.subdir);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}_${safeName}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, params.bytes);
  return {
    fileName,
    fullPath,
  };
}

