import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function withEvidenceRunLock(root, run) {
  const directory = join(root, '.angular');
  const lock = join(directory, 'evidence-run.lock');
  mkdirSync(directory, { recursive: true });
  try {
    mkdirSync(lock);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Evidence run already active or stale lock at ${lock}; check running processes before removing it`);
    throw error;
  }
  try {
    writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid }) + '\n');
    return run();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}
