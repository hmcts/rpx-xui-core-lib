import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = new URL('../../dist/core-lib/fesm2022/hmcts-rpx-xui-core-lib-case-notifier.mjs', import.meta.url);
const probe = entry => `
  import assert from 'node:assert/strict';
  assert.equal(typeof Reflect.getMetadata, 'undefined');
  await import('@angular/compiler');
  const { CaseNotifier, CaseView, CaseField } = await import(${JSON.stringify(entry)});
  const { of, firstValueFrom } = await import('rxjs');
  const notifier = new CaseNotifier({ getCaseViewV2: () => of({ tabs: [{ fields: [{ id: 'field', field_type: { type: 'Text' }, value: 'value' }] }] }) });
  const result = await firstValueFrom(notifier.fetchAndRefresh('123'));
  assert.equal(typeof Reflect.getMetadata, 'function');
  assert.ok(result instanceof CaseView);
  assert.ok(result.tabs[0].fields[0] instanceof CaseField);
`;
const run = (entry, makeProbe = probe) => spawnSync(process.execPath, ['--input-type=module', '-e', makeProbe(entry)], { cwd: root, encoding: 'utf8' });
const notifierOnlyProbe = entry => `
  import assert from 'node:assert/strict';
  assert.equal(typeof Reflect.getMetadata, 'undefined');
  await import('@angular/compiler');
  const { CaseNotifier } = await import(${JSON.stringify(entry)});
  const { of, firstValueFrom } = await import('rxjs');
  const notifier = new CaseNotifier({ getCaseViewV2: () => of({ tabs: [{ fields: [{ id: 'field', field_type: { type: 'Text' }, value: 'value' }] }] }) });
  const result = await firstValueFrom(notifier.fetchAndRefresh('123'));
  assert.equal(typeof Reflect.getMetadata, 'function');
  assert.equal(typeof result.tabs[0].fields[0].isComplex, 'function');
`;

test('notifier-only import initializes metadata and hydrates nested fields', async () => {
  const result = run('@hmcts/rpx-xui-core-lib/case/notifier');
  assert.equal(result.status, 0, result.stderr);
});

test('removing metadata initialization breaks the isolated notifier', async () => {
  const directory = await mkdtemp(join(root, 'test-results/notifier-fault-'));
  try {
    const text = await readFile(source, 'utf8');
    const changed = text.replace("import 'reflect-metadata';", '');
    assert.notEqual(changed, text, 'Expected metadata import in the built entry');
    const file = join(directory, 'broken.mjs');
    await writeFile(file, changed);
    const result = run(pathToFileURL(file).href);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Reflect\.getMetadata is not a function/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('tree-shaken notifier bundle retains metadata initialization', async () => {
  const { build } = await import('esbuild');
  const directory = await mkdtemp(join(root, 'test-results/notifier-bundle-'));
  try {
    const file = join(directory, 'notifier.mjs');
    await build({
      stdin: { contents: "export { CaseNotifier } from '@hmcts/rpx-xui-core-lib/case/notifier';", resolveDir: root },
      outfile: file, bundle: true, format: 'esm', platform: 'node', external: ['@angular/*', 'rxjs', 'rxjs/*'], logLevel: 'silent'
    });
    const result = run(pathToFileURL(file).href, notifierOnlyProbe);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('tree-shaken notifier probe fails if metadata initialization is removed', async () => {
  const { build } = await import('esbuild');
  const directory = await mkdtemp(join(root, 'test-results/notifier-bundle-fault-'));
  try {
    const original = await readFile(source, 'utf8');
    const changed = original.replace("import 'reflect-metadata';", '');
    assert.notEqual(changed, original, 'Expected metadata import in the built entry');
    const broken = join(directory, 'broken.mjs');
    const bundle = join(directory, 'bundle.mjs');
    await writeFile(broken, changed);
    await build({
      stdin: { contents: `export { CaseNotifier } from ${JSON.stringify(broken)};`, resolveDir: root },
      outfile: bundle, bundle: true, format: 'esm', platform: 'node', external: ['@angular/*', 'rxjs', 'rxjs/*'], logLevel: 'silent'
    });
    const result = run(pathToFileURL(bundle).href, notifierOnlyProbe);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Reflect\.getMetadata is not a function/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
