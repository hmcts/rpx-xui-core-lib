import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { modelResolutions, prosemirrorPackages } from './prosemirror-identity.mjs';
import * as identity from './prosemirror-identity.mjs';

function verify(resolutions) {
  for (const { dependency, expected, actual } of resolutions) {
    assert.equal(actual, expected, `${dependency} resolves a different model copy`);
  }
}

test('editor dependencies resolve the same ProseMirror model as the library', () => {
  const rootRequire = createRequire(new URL('../../package.json', import.meta.url));
  verify(modelResolutions(rootRequire, ['ngx-editor', 'prosemirror-state', 'prosemirror-commands', 'prosemirror-schema-list']));
});

test('Core shares the consumer-provided ProseMirror model with ngx-editor', async () => {
  const sourceManifest = JSON.parse(await readFile(new URL('../../projects/core-lib/package.json', import.meta.url), 'utf8'));
  const root = await mkdtemp(join(tmpdir(), 'core-consumer-model-identity-'));
  try {
    const modules = join(root, 'node_modules');
    const corePath = join(modules, '@hmcts/rpx-xui-core-lib');
    const editorPath = join(modules, 'ngx-editor');
    const rootModel = join(modules, 'prosemirror-model');
    const coreManifest = {
      name: sourceManifest.name,
      version: sourceManifest.version,
      main: 'index.js',
      dependencies: sourceManifest.dependencies,
      peerDependencies: sourceManifest.peerDependencies
    };
    await writeFile(join(root, 'package.json'), JSON.stringify({ private: true }));
    await mkdir(corePath, { recursive: true });
    await writeFile(join(corePath, 'package.json'), JSON.stringify(coreManifest));
    await writeFile(join(corePath, 'index.js'), 'module.exports = {};\n');
    await mkdir(editorPath, { recursive: true });
    await writeFile(join(editorPath, 'package.json'), JSON.stringify({
      name: 'ngx-editor', main: 'index.js', dependencies: { 'prosemirror-model': '^1.25.0' }
    }));
    await writeFile(join(editorPath, 'index.js'), 'module.exports = {};\n');
    await mkdir(rootModel, { recursive: true });
    await writeFile(join(rootModel, 'package.json'), JSON.stringify({ name: 'prosemirror-model', version: '1.25.11', main: 'index.js' }));
    await writeFile(join(rootModel, 'index.js'), 'module.exports = {};\n');

    for (const [dependency, version] of Object.entries(sourceManifest.dependencies)) {
      if (!dependency.startsWith('prosemirror-')) continue;
      const nested = join(corePath, 'node_modules', dependency);
      await mkdir(nested, { recursive: true });
      await writeFile(join(nested, 'package.json'), JSON.stringify({ name: dependency, version, main: 'index.js' }));
      await writeFile(join(nested, 'index.js'), 'module.exports = {};\n');
    }

    const rootRequire = createRequire(join(root, 'package.json'));
    verify(modelResolutions(rootRequire, ['@hmcts/rpx-xui-core-lib', 'ngx-editor']));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency identity check detects a nested second model copy', async () => {
  const root = await mkdtemp(join(tmpdir(), 'core-model-identity-'));
  try {
    const packagePath = join(root, 'node_modules', 'example-editor');
    const rootModel = join(root, 'node_modules', 'prosemirror-model');
    const nestedModel = join(packagePath, 'node_modules', 'prosemirror-model');
    for (const path of [packagePath, rootModel, nestedModel]) {
      await mkdir(path, { recursive: true });
      await writeFile(join(path, 'index.js'), 'module.exports = {};\n');
    }
    const rootRequire = createRequire(join(root, 'package.json'));
    assert.throws(() => verify(modelResolutions(rootRequire, ['example-editor'])), /example-editor resolves a different model copy/);
    const sharedEditor = join(root, 'node_modules', 'shared-editor');
    await mkdir(sharedEditor, { recursive: true });
    await writeFile(join(sharedEditor, 'index.js'), 'module.exports = {};\n');
    verify(modelResolutions(rootRequire, ['shared-editor']));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('packed ESM identity check detects a nested ProseMirror state copy', async () => {
  const root = await mkdtemp(join(tmpdir(), 'core-esm-model-identity-'));
  try {
    const coreEntry = join(root, 'node_modules/@hmcts/rpx-xui-core-lib/fesm2022/editor.mjs');
    const editorEntry = join(root, 'node_modules/ngx-editor/fesm2022/ngx-editor.mjs');
    const shared = join(root, 'node_modules');
    for (const entry of [coreEntry, editorEntry]) {
      await mkdir(join(entry, '..'), { recursive: true });
      await writeFile(entry, prosemirrorPackages.map(dependency => `import '${dependency}';`).join('\n') + '\n');
    }
    for (const dependency of prosemirrorPackages) {
      const module = join(shared, dependency);
      await mkdir(module, { recursive: true });
      await writeFile(join(module, 'package.json'), JSON.stringify({ name: dependency, exports: { '.': { import: './index.mjs' } } }));
      await writeFile(join(module, 'index.mjs'), 'export {};\n');
    }

    assert.doesNotThrow(() => identity.assertSharedProsemirrorResolution(coreEntry, editorEntry));

    const nestedState = join(root, 'node_modules/@hmcts/rpx-xui-core-lib/node_modules/prosemirror-state');
    await mkdir(nestedState, { recursive: true });
    await writeFile(join(nestedState, 'package.json'), JSON.stringify({ name: 'prosemirror-state', exports: { '.': { import: './index.mjs' } } }));
    await writeFile(join(nestedState, 'index.mjs'), 'export {};\n');
    assert.throws(() => identity.assertSharedProsemirrorResolution(coreEntry, editorEntry), /prosemirror-state/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('packed ProseMirror peers must intersect ngx-editor runtime ranges', async () => {
  const coreManifest = JSON.parse(await readFile(new URL('../../projects/core-lib/package.json', import.meta.url), 'utf8'));
  const editorManifest = JSON.parse(await readFile(new URL('../../node_modules/ngx-editor/package.json', import.meta.url), 'utf8'));
  assert.doesNotThrow(() => identity.assertCompatibleProsemirrorPeers(coreManifest, editorManifest));
  assert.throws(() => identity.assertCompatibleProsemirrorPeers({
    ...coreManifest,
    peerDependencies: { ...coreManifest.peerDependencies, 'prosemirror-state': '^9.0.0' }
  }, editorManifest), /prosemirror-state/);
});
