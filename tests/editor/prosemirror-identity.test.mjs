import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { modelResolutions } from './prosemirror-identity.mjs';

function verify(resolutions) {
  for (const { dependency, expected, actual } of resolutions) {
    assert.equal(actual, expected, `${dependency} resolves a different model copy`);
  }
}

test('editor dependencies resolve the same ProseMirror model as the library', () => {
  const rootRequire = createRequire(new URL('../../package.json', import.meta.url));
  verify(modelResolutions(rootRequire, ['ngx-editor', 'prosemirror-state', 'prosemirror-commands', 'prosemirror-schema-list']));
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
