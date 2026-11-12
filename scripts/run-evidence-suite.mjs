import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { currentIdentity } from './evidence-identity.mjs';
import { sourceSnapshot } from './evidence-source-snapshot.mjs';
import { writeFeatureMatrix } from './feature-evidence-matrix.mjs';

const runId = randomUUID();
process.env.CORE_EVIDENCE_RUN_ID = runId;
rmSync('test-results', { recursive: true, force: true });
mkdirSync('test-results/lane-provenance', { recursive: true });
writeFileSync('test-results/lane-provenance/run.json', JSON.stringify({ ...currentIdentity(process.cwd()), sourceSnapshot: sourceSnapshot(process.cwd()) }) + '\n');
const result = spawnSync(process.execPath, ['.yarn/releases/yarn-4.18.1.cjs', 'test:all:sequence'], { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
if (result.status === 0) {
  writeFeatureMatrix(process.cwd(), currentIdentity(process.cwd()), true);
  const verification = spawnSync(process.execPath, ['tests/reporters/browser-check.cjs', 'test-results/odhin/browser/index.html', '--feature-matrix'], { stdio: 'inherit', env: process.env });
  if (verification.error) throw verification.error;
  if (verification.status !== 0) throw new Error('Modified feature evidence report failed browser verification');
} else {
  try { writeFeatureMatrix(process.cwd(), currentIdentity(process.cwd()), false); } catch (error) {
    console.error('Unable to add feature evidence to the failed run report:', error.message);
  }
}
process.exitCode = result.status ?? 1;
