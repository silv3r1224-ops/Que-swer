import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolves the local storage root (relative to the server package). */
export function storageRoot(): string {
  const root = path.resolve(__dirname, '../../', env.STORAGE_PATH);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export async function saveLocalFile(key: string, buffer: Buffer): Promise<string> {
  const root = storageRoot();
  const full = path.join(root, key);
  const rel = path.relative(root, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new AppError('Invalid storage key', { statusCode: 400 });
  }
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, buffer);
  return key;
}

export async function readLocalFile(key: string): Promise<Buffer> {
  const root = storageRoot();
  const full = path.join(root, key);
  const rel = path.relative(root, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new AppError('Invalid storage key', { statusCode: 400 });
  }
  try {
    return await fs.promises.readFile(full);
  } catch {
    throw new AppError('Paper file not found', { statusCode: 404 });
  }
}

export async function deleteLocalFile(key: string): Promise<void> {
  try {
    await fs.promises.unlink(path.join(storageRoot(), key));
  } catch {
    // ignore missing files
  }
}
