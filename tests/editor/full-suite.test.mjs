import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('full local suite requires source, selective-loading and packed editor checks', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const commands = manifest.scripts['test:all:sequence'].split(' && ');
  const expected = ['node scripts/run-evidence-lane.mjs editorUnit test:editor', 'yarn test:editor:loading', 'yarn test:editor:packed'];
  const gate = commands.indexOf('yarn check:contracts');
  assert.ok(gate >= 0);
  for (const command of expected) {
    assert.equal(commands.filter(entry => entry === command).length, 1, `${command} must run exactly once`);
    assert.ok(commands.indexOf(command) < gate, `${command} must run before the contract gate`);
  }
});
