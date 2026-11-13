import { spawnSync } from 'node:child_process';

// This runner is diagnostic only; prerequisite failures block dependent evidence.
export const steps = [
  ['build', 'yarn', 'build'], ['lint', 'yarn', 'lint'],
  ['tooling-security', 'yarn', 'test:tooling-security'], ['reporters', 'yarn', 'test:reporters'],
  ['contracts-tests', 'yarn', 'test:contracts'], ['compatibility-contracts', 'yarn', 'test:compatibility:contracts'],
  ['refDataUnit', 'lane', 'test:ref-data'], ['locationUnit', 'lane', 'test:locations'], ['windowUnit', 'lane', 'test:window'], ['cookieUnit', 'lane', 'test:cookie'], ['featureToggleUnit', 'lane', 'test:feature-toggle'], ['roleUnit', 'lane', 'test:roles'], ['unit', 'lane', 'test'], ['nodeUnit', 'lane', 'test:node:utils'], ['nodeServerUnit', 'lane', 'test:node:server'], ['i18nUnit', 'lane', 'test:i18n'],
 ['package', 'lane', 'test:package'],
  ['host-build', 'yarn', 'build:host'], ['browser-support', 'yarn', 'test:browser:support'],
  ['browser', 'lane', 'test:browser'], ['cacheBrowser', 'lane', 'test:cache-upgrade'],
  ['contracts-gate', 'yarn', 'check:contracts'],
  ['publisher-check', 'node', 'tests/reporters/odhin-site-publisher.cjs --check-source test-results/odhin'],
  ['browser-report', 'node', 'tests/reporters/browser-check.cjs test-results/odhin/browser/index.html'],
  ['cache-report', 'node', 'tests/reporters/browser-check.cjs test-results/odhin/cache-upgrade/index.html']
];

/** @type {Record<string, string[]>} */
export const prerequisites = {
  refDataUnit: ['build'], locationUnit: ['build'], windowUnit: ['build'], cookieUnit: ['build'], featureToggleUnit: ['build'], roleUnit: ['build'], unit: ['build'], nodeUnit: ['build'], nodeServerUnit: ['build'], i18nUnit: ['build'],
  package: ['build'], 'host-build': ['build'],
  browser: ['host-build', 'browser-support'],
  cacheBrowser: ['package', 'host-build', 'browser-support'],
  'contracts-gate': ['refDataUnit', 'locationUnit', 'windowUnit', 'cookieUnit', 'featureToggleUnit', 'roleUnit', 'unit', 'nodeUnit', 'nodeServerUnit', 'i18nUnit', 'package', 'browser', 'cacheBrowser'],
  'publisher-check': ['contracts-gate'], 'browser-report': ['browser'], 'cache-report': ['cacheBrowser']
};

/** @typedef {{status: number | null, signal?: string | null, error?: Error | string}} StepResult */
/** @typedef {{name: string, status: string, exitCode: number | null, blockers?: string[], error?: string, signal?: string}} Outcome */
/** @param {(name: string, kind: string, command: string) => StepResult} run
 * @param {string[][]} plan
 * @param {Record<string, string[]>} dependencies */
export function runSteps(run, plan = steps, dependencies = prerequisites) {
  /** @type {Outcome[]} */
  const results = [];
  let interrupted = false;
  for (const [name, kind, command] of plan) {
    if (interrupted) { results.push({ name, status: 'blocked', exitCode: null, blockers: ['interrupted'] }); continue; }
    const blockers = (dependencies[name] ?? []).filter(dependency => !results.some(result => result.name === dependency && result.status === 'passed'));
    if (blockers.length) {
      results.push({ name, status: 'blocked', exitCode: null, blockers });
      continue;
    }
    let result;
    try { result = run(name, kind, command); } catch (error) { result = { status: null, error: error.message }; }
    results.push({ name, status: result.status === 0 && !result.error && !result.signal ? 'passed' : 'failed', exitCode: result.status ?? null, ...(result.error ? { error: String(result.error) } : {}), ...(result.signal ? { signal: result.signal } : {}) });
    if (result.signal) interrupted = true;
  }
  return { diagnosticOnly: true, releaseReady: false, results, passed: results.every(result => result.status === 'passed') };
}

/** @param {string} stdout
 * @param {string} stderr */
export function startupCollision(stdout, stderr) {
  return /\bEADDRINUSE\b|\bPort \d+ is already in use\b/i.test(stdout + '\n' + stderr);
}

/** @param {(command: string, args: string[], options: import('node:child_process').SpawnSyncOptionsWithStringEncoding) => import('node:child_process').SpawnSyncReturns<string>} spawn
 * @param {(stdout: string, stderr: string) => void} output */
export function executeStep(name, kind, command, cwd, spawn = spawnSync, output = (stdout, stderr) => { if (stdout) process.stdout.write(stdout); if (stderr) process.stderr.write(stderr); }) {
  const args = kind === 'lane' ? ['scripts/run-evidence-lane.mjs', name, command] : kind === 'node' ? command.split(' ') : ['.yarn/releases/yarn-4.18.1.cjs', command];
  const result = spawn(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['inherit', 'pipe', 'pipe'], env: { ...process.env, ...(name === 'browser' || name === 'cacheBrowser' ? { PW_ODHIN_LIGHTWEIGHT: 'false' } : {}) } });
  output(result.stdout ?? '', result.stderr ?? '');
  if (startupCollision(result.stdout ?? '', result.stderr ?? '')) return { ...result, status: result.status || 1, error: 'Server startup port collision: test server ownership is unverified' };
  return result;
}
