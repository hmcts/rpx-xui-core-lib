import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';

// Correlates tracked and non-ignored working-tree files, not installed dependencies.
export function sourceSnapshot(root) {
  const files = execFileSync('/usr/bin/git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString('utf8').split('\0').filter(Boolean).sort();
  const hash = createHash('sha256');
  for (const name of [...new Set(files)]) {
    const file = resolve(root, name);
    hash.update(name).update('\0');
    let stat;
    try { stat = lstatSync(file); } catch (error) { if (error.code !== 'ENOENT') throw error; hash.update('missing\0'); continue; }
    hash.update(String(stat.mode)).update('\0');
    if (stat.isSymbolicLink()) hash.update('link\0').update(readlinkSync(file));
    else if (stat.isFile()) hash.update('file\0').update(createHash('sha256').update(readFileSync(file)).digest());
    else throw new Error(`Unsupported source entry: ${name}`);
    hash.update('\0');
  }
  return hash.digest('hex');
}
