import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function preparePackedWorkspace(root) {
  const workspace = await mkdtemp(join(tmpdir(), 'core-editor-packed-'));
  try {
  for (const entry of ['angular.json', 'package.json', 'tsconfig.json', 'projects', 'tests/editor']) {
    await cp(join(root, entry), join(workspace, entry), { recursive: true });
  }
  const modules = join(workspace, 'node_modules');
  await mkdir(join(modules, '@hmcts'), { recursive: true });
  for (const entry of await readdir(join(root, 'node_modules'))) {
    if (entry === '@hmcts') continue;
    await symlink(join(root, 'node_modules', entry), join(modules, entry));
  }
  for (const entry of await readdir(join(root, 'node_modules', '@hmcts'))) {
    if (entry === 'rpx-xui-core-lib') continue;
    await symlink(join(root, 'node_modules', '@hmcts', entry), join(modules, '@hmcts', entry));
  }
  const configPath = join(workspace, 'tests/editor/tsconfig.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  for (const name of ['case/notifier', 'case/editor-source', 'case/models', 'case/reference', 'case/editor-date', 'browser/session-storage', 'i18n']) delete config.compilerOptions.paths[`@hmcts/rpx-xui-core-lib/${name}`];
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  return workspace;
  } catch (error) {
    await rm(workspace, { recursive: true, force: true });
    throw error;
  }
}
