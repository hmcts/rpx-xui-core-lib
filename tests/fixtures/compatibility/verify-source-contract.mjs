import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function verifySourceHashes(contract, readSource, managerBytes) {
  for (const [id, source] of Object.entries(contract.sources)) {
    assert.match(source.gitHead, /^[a-f0-9]{40}$/, `Invalid source SHA: ${id}`);
    for (const [path, expected] of Object.entries(source.files)) {
      assert.match(expected, /^[a-f0-9]{64}$/, `Invalid source hash: ${id}:${path}`);
      assert.equal(hash(readSource(id, source.gitHead, path)), expected, `Source hash mismatch: ${id}:${path}`);
    }
  }
  assert.equal(hash(managerBytes), contract.harness.standalone_api_manager.sha256, 'Standalone API manager hash mismatch');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [workspace, core, apiManager] = process.argv.slice(2);
  assert.ok(workspace && core && apiManager && process.argv.length === 5, 'Usage: node verify-source-contract.mjs WORKSPACE CORE_REPOSITORY YARN_4_7_BINARY');
  const contract = JSON.parse(readFileSync(new URL('./source-contract.json', import.meta.url), 'utf8'));
  verifySourceHashes(contract, (id, sha, path) => execFileSync('git', ['-C', id === 'core' ? core : join(workspace, id), 'show', `${sha}:${path}`], { maxBuffer: 20 * 1024 * 1024 }), readFileSync(apiManager));
  console.log('All pinned source objects and the synthetic API manager match their SHA-256 receipts.');
}
