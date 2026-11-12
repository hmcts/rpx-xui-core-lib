import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import ts from 'typescript';

export function inspectLoadingGraph(directory) {
  const files = readdirSync(directory).filter(name => name.endsWith('.js'));
  const entry = files.filter(name => /^main-.*\.js$/.test(name));
  assert.equal(entry.length, 1, 'Expected exactly one Angular main entry');
  const maps = new Map(files.map(name => [name, JSON.parse(readFileSync(join(directory, name + '.map'), 'utf8'))]));
  const find = suffix => {
    const matches = files.filter(name => maps.get(name).sources.some(source => source.endsWith(suffix)));
    assert.equal(matches.length, 1, `Expected one mapped chunk for ${suffix}`);
    return matches[0];
  };
  const validation = find('/hmcts-rpx-xui-core-lib-forms-validation.mjs');
  const date = find('/hmcts-rpx-xui-core-lib-case-editor-date.mjs');
  const session = find('/hmcts-rpx-xui-core-lib-case-session-error.mjs');
  const initial = new Set();
  const visit = name => {
    if (initial.has(name)) return;
    assert.ok(maps.has(name), `Missing static chunk or source map: ${name}`);
    initial.add(name);
    const source = ts.createSourceFile(name, readFileSync(join(directory, name), 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    for (const node of source.statements) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith('./')) visit(basename(node.moduleSpecifier.text));
    }
  };
  visit(entry[0]);
  assert.ok(initial.has(validation), 'Validation entry must be in the initial static graph');
  assert.ok(!initial.has(date), 'Date entry must not be in the initial static graph');
  assert.ok(!initial.has(session), 'Session entry must not be in the initial static graph');
  assert.notEqual(date, session, 'Date and session pages must occupy distinct chunks');
  return { initial: [...initial].sort((a, b) => a < b ? -1 : a > b ? 1 : 0), date, session };
}

export function assertPackedBytes(actual, packed) {
  assert.deepEqual(actual, packed, 'Installed artifact bytes differ from packed candidate');
}

export function assertEagerDateFailure(report) {
  const specs = [];
  function collect(suite) {
    if (Array.isArray(suite.specs)) specs.push(...suite.specs);
    if (Array.isArray(suite.suites)) suite.suites.forEach(collect);
  }
  if (!Array.isArray(report.suites)) throw new Error('Missing mutant browser suite');
  report.suites.forEach(collect);
  const target = specs.filter(spec => spec.title === 'installed package keeps date and session pages lazy and usable');
  assert.equal(target.length, 1, 'Expected exactly one mutant browser test');
  assert.equal(target[0].tests.length, 1, 'Expected exactly one mutant project');
  const result = target[0].tests[0];
  assert.equal(result.status, 'unexpected');
  assert.equal(result.results.length, 1, 'Mutant must not retry');
  assert.equal(result.results[0].status, 'failed');
  assert.match(result.results[0].error?.message ?? '', /Date chunk must not be requested before activation/);
}
