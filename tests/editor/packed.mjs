import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { preparePackedWorkspace } from './packed-workspace.mjs';
import { sourceSnapshot } from '../../scripts/evidence-source-snapshot.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = join(root, 'test-results/editor-packed');
await rm(output, { recursive: true, force: true });
const initialSnapshot = sourceSnapshot(root);
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status ?? result.signal}`);
}
run(process.execPath, ['.yarn/releases/yarn-4.18.1.cjs', 'build']);
if (sourceSnapshot(root) !== initialSnapshot) throw new Error('Source changed during the packed editor build');
const workspace = await preparePackedWorkspace(root);
try {
  const npm = join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
  const pack = spawnSync(process.execPath, [npm, 'pack', join(root, 'dist/core-lib'), '--pack-destination', workspace, '--ignore-scripts', '--json'], {
    cwd: workspace, encoding: 'utf8', env: { ...process.env, npm_config_cache: join(workspace, 'npm-cache') }
  });
  if (pack.error) throw pack.error;
  if (pack.status !== 0) throw new Error(`npm pack failed: ${pack.stderr}`);
  const artifact = JSON.parse(pack.stdout)[0].filename;
  const packageDirectory = join(workspace, 'node_modules/@hmcts/rpx-xui-core-lib');
  await mkdir(packageDirectory, { recursive: true });
  run('/usr/bin/tar', ['-xzf', join(workspace, artifact), '--strip-components=1', '-C', packageDirectory], { cwd: workspace });
  const metadata = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'));
  if (metadata.name !== '@hmcts/rpx-xui-core-lib') throw new Error('Packed package has an unexpected name');
  console.log(`Testing packed ${metadata.name}@${metadata.version} in an isolated workspace`);
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '-c', 'tests/editor/playwright.config.mjs'], { cwd: workspace });
  if (sourceSnapshot(root) !== initialSnapshot) throw new Error('Source changed during the packed editor run');
  const sha256 = createHash('sha256').update(await readFile(join(workspace, artifact))).digest('hex');
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'artifact.json'), JSON.stringify({ sha256, sourceSnapshot: initialSnapshot }) + '\n');
} finally {
  try {
    const report = join(workspace, 'test-results/editor');
    await mkdir(output, { recursive: true });
    await cp(report, output, { recursive: true, force: true }).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
