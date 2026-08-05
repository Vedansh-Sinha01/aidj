import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Résumés are candidate PII — stored outside /public and only ever served
// through an authenticated API route, never as a static file.
const STORAGE_ROOT = path.join(process.cwd(), "storage");
const TMP_DIR = path.join(STORAGE_ROOT, "tmp");
const RESUMES_DIR = path.join(STORAGE_ROOT, "resumes");

async function ensureDirs() {
  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(RESUMES_DIR, { recursive: true });
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveTempUpload(buffer: Buffer, originalName: string) {
  await ensureDirs();
  const tempId = randomUUID();
  const fileName = `${tempId}-${safeName(originalName)}`;
  await writeFile(path.join(TMP_DIR, fileName), buffer);
  return { tempKey: fileName };
}

export async function readTempUpload(tempKey: string) {
  const filePath = path.join(TMP_DIR, safeName(tempKey));
  if (!existsSync(filePath)) return null;
  return readFile(filePath);
}

/** Moves a temp upload into permanent, candidate-scoped storage. Returns the storage key. */
export async function finalizeUpload(tempKey: string, candidateId: string) {
  await ensureDirs();
  const src = path.join(TMP_DIR, safeName(tempKey));
  const destName = `${candidateId}-${safeName(tempKey)}`;
  const dest = path.join(RESUMES_DIR, destName);
  await rename(src, dest);
  return destName;
}

export async function readResume(storageKey: string) {
  const filePath = path.join(RESUMES_DIR, safeName(storageKey));
  if (!existsSync(filePath)) return null;
  return readFile(filePath);
}

export async function discardTempUpload(tempKey: string) {
  const filePath = path.join(TMP_DIR, safeName(tempKey));
  if (existsSync(filePath)) await unlink(filePath).catch(() => {});
}
