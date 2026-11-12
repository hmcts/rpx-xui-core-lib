import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentIdentity } from './evidence-identity.mjs';
import { sourceSnapshot } from './evidence-source-snapshot.mjs';
import { executeStep, runSteps } from './diagnostic-lanes.mjs';
import { withEvidenceRunLock } from './evidence-run-lock.mjs';
import { writeFeatureMatrix } from './feature-evidence-matrix.mjs';

/** @param {string} root
 * @param {(name: string, kind: string, command: string, cwd: string) => import('./diagnostic-lanes.mjs').StepResult} runStep
 * @param {typeof renameSync} move */
export function runDiagnostic(root, runStep = executeStep, identity = currentIdentity, snapshot = sourceSnapshot, move = renameSync) {
  if (process.env.CI) throw new Error('Diagnostic mode is local only');
  return withEvidenceRunLock(root, () => {
    const before = snapshot(root);
    const id = randomUUID();
    const previousRunId = process.env.CORE_EVIDENCE_RUN_ID;
    process.env.CORE_EVIDENCE_RUN_ID = id;
    try {
      const run = identity(root);
      const output = join(root, 'test-results');
      const previous = ['test-results', 'playwright-report'].filter(name => existsSync(join(root, name)));
      let backup = null;
      if (previous.length) {
        mkdirSync(join(root, '.angular'), { recursive: true });
        backup = mkdtempSync(join(root, '.angular/diagnostic-backup-'));
        console.log(`Preserving previous test evidence in: ${backup}`);
        const moved = [];
        try {
          for (const name of previous) {
            move(join(root, name), join(backup, name));
            moved.push(name);
          }
        } catch (error) {
          throw new Error(`Backup failed: ${error.message}. Preserved at ${backup}: ${moved.join(', ') || 'none'}. Remaining at ${root}: ${previous.filter(name => !moved.includes(name)).join(', ') || 'none'}`, { cause: error });
        }
      }
      mkdirSync(join(output, 'lane-provenance'), { recursive: true });
      if (snapshot(root) !== before) throw new Error('Source changed before diagnostic run');
      const bound = { ...run, sourceSnapshot: before };
      writeFileSync(join(output, 'lane-provenance/run.json'), JSON.stringify(bound) + '\n');
      const report = runSteps((name, kind, command) => runStep(name, kind, command, root));
      report.identity = run;
      report.sourceSnapshot = before;
      report.backup = backup;
      const browserReport = join(output, 'odhin/browser/index.html');
      if (existsSync(browserReport)) {
        try {
          writeFeatureMatrix(root, run, false);
          report.featureMatrix = 'unavailable';
          const finalCheck = runSteps((name, kind, command) => runStep(name, kind, command, root), [
            ['diagnostic-report', 'node', 'tests/reporters/browser-check.cjs test-results/odhin/browser/index.html --diagnostic-matrix'],
          ], {});
          report.results.push(...finalCheck.results);
          if (!finalCheck.passed) report.passed = false;
        } catch (error) {
          report.passed = false;
          report.featureMatrix = `failed: ${error.message}`;
        }
      } else {
        report.featureMatrix = 'not produced';
        if (report.results.find(result => result.name === 'browser')?.status === 'passed') report.passed = false;
      }
      if (snapshot(root) !== before) { report.passed = false; report.sourceChanged = true; }
      writeFileSync(join(output, 'diagnostic-status.json'), JSON.stringify(report, null, 2) + '\n');
      return report;
    } finally {
      if (previousRunId === undefined) delete process.env.CORE_EVIDENCE_RUN_ID;
      else process.env.CORE_EVIDENCE_RUN_ID = previousRunId;
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runDiagnostic(process.cwd());
  console.log('Diagnostic only: strict test:all and required human review determine readiness.');
  process.exitCode = report.passed ? 0 : 1;
}
