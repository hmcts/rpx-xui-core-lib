import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { browserOutcomes } from '../../scripts/check-contracts.mjs';
import { sourceSnapshot } from '../../scripts/evidence-source-snapshot.mjs';
import { preparePackedWorkspace } from '../editor/packed-workspace.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export function assertPackedBrowserReport(report, required) {
  assert.ok(required.length > 0, 'Packed browser proof needs a nonempty required inventory');
  const byId = (a, b) => a.id.localeCompare(b.id);
  const expected = required.map(row => ({ id: JSON.stringify([row.projectName, row.title]), passed: true }));
  assert.deepEqual(browserOutcomes(report).sort(byId), expected.sort(byId), 'Packed browser cases differ from required feature inventory');
  assert.equal(report.stats?.expected, required.length, 'Packed browser expected summary differs');
  for (const status of ['unexpected', 'skipped', 'flaky']) assert.equal(report.stats?.[status], 0, `Packed browser ${status} summary differs`);
}

export async function verifyPackedBrowser({ name, features, testMatch }) {
const output = join(root, `test-results/${name}-packed`);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const initialSnapshot = sourceSnapshot(root);
const workspace = await preparePackedWorkspace(root);
function run(command, args, cwd = workspace) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status ?? result.signal}`);
}
try {
  run(process.execPath, [join(root, '.yarn/releases/yarn-4.19.0.cjs'), 'build'], root);
  assert.equal(sourceSnapshot(root), initialSnapshot, 'Source changed during the packed controls build');
  await cp(join(root, 'apps/test-host'), join(workspace, 'apps/test-host'), { recursive: true });
  const npm = join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
  const packed = spawnSync(process.execPath, [npm, 'pack', join(root, 'dist/core-lib'), '--pack-destination', workspace, '--ignore-scripts', '--json'], {
    cwd: workspace, encoding: 'utf8', env: { ...process.env, npm_config_cache: join(workspace, 'npm-cache') }
  });
  if (packed.error) throw packed.error;
  assert.equal(packed.status, 0, `npm pack failed: ${packed.stderr}`);
  const artifact = join(workspace, JSON.parse(packed.stdout)[0].filename);
  const installed = join(workspace, 'node_modules/@hmcts/rpx-xui-core-lib');
  await mkdir(installed, { recursive: true });
  run('/usr/bin/tar', ['-xzf', artifact, '--strip-components=1', '-C', installed]);
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  if (manifest.name !== '@hmcts/rpx-xui-core-lib') throw new Error('Unexpected packed library identity');
  const config = {
    testDir: join(root, 'tests/browser'),
    testMatch,
    outputDir: join(output, 'artifacts'),
    fullyParallel: true, workers: 4, retries: 0,
    reporter: [['list'], ['json', { outputFile: join(output, 'browser.json') }]],
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
    use: { baseURL: 'http://127.0.0.1:4313', trace: 'retain-on-failure' },
    webServer: {
      command: `'${process.execPath.replaceAll("'", String.raw`'\''`)}' node_modules/@angular/cli/bin/ng.js serve test-host --host 127.0.0.1 --port 4313`,
      cwd: workspace, url: 'http://127.0.0.1:4313', reuseExistingServer: false, timeout: 120_000
    }
  };
  await writeFile(join(workspace, 'packed-controls.config.mjs'), `export default ${JSON.stringify(config)};\n`);
  run(process.execPath, [join(root, 'node_modules/@playwright/test/cli.js'), 'test', '-c', join(workspace, 'packed-controls.config.mjs')]);
  const report = JSON.parse(await readFile(join(output, 'browser.json'), 'utf8'));
  const inventory = JSON.parse(await readFile(join(root, 'tests/contracts.json'), 'utf8'));
  const expected = inventory.browser.required.filter(row => features.includes(row.feature));
  assertPackedBrowserReport(report, expected);
  assert.equal(sourceSnapshot(root), initialSnapshot, 'Source changed during packed controls checks');
  await writeFile(join(output, 'artifact.json'), JSON.stringify({ sha256: createHash('sha256').update(await readFile(artifact)).digest('hex'), version: manifest.version, sourceSnapshot: initialSnapshot }) + '\n');
} finally {
  await rm(workspace, { recursive: true, force: true });
}
}
