const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const workflow = yaml.load(readFileSync(join(__dirname, '../../.github/workflows/odhin-pages.yml'), 'utf8'));
const wait = workflow.jobs.publish.steps.find((step) => step.name === 'Wait for Pages artifact visibility');

function runWait(foundAfter, errorBefore = 0) {
  const dir = mkdtempSync(join(tmpdir(), 'core-pages-wait-'));
  try {
    const countFile = join(dir, 'count');
    writeFileSync(countFile, '0');
    writeFileSync(join(dir, 'gh'), `#!/bin/sh
[ "$1" = api ] || exit 10
[ "$2" = "repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/artifacts" ] || exit 11
[ "$3" = --jq ] || exit 12
printf '%s' "$4" | grep -F ".id == $EXPECTED_ARTIFACT_ID" >/dev/null || exit 13
printf '%s' "$4" | grep -F '.name == "github-pages"' >/dev/null || exit 14
printf '%s' "$4" | grep -F '.expired == false' >/dev/null || exit 15
count=$(cat "$COUNT_FILE")
count=$((count + 1))
printf '%s' "$count" > "$COUNT_FILE"
if [ "$count" -le "$ERROR_BEFORE" ]; then exit 16; fi
if [ "$FOUND_AFTER" -gt 0 ] && [ "$count" -ge "$FOUND_AFTER" ]; then printf '12345\\n'; fi
`, { mode: 0o755 });
    const sleepFile = join(dir, 'sleep-log');
    writeFileSync(join(dir, 'sleep'), '#!/bin/sh\nprintf "%s\\n" "$1" >> "$SLEEP_FILE"\n', { mode: 0o755 });
    const result = spawnSync('bash', ['-c', wait.run], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, COUNT_FILE: countFile, FOUND_AFTER: String(foundAfter), ERROR_BEFORE: String(errorBefore), SLEEP_FILE: sleepFile, GITHUB_REPOSITORY: 'hmcts/rpx-xui-core-lib', GITHUB_RUN_ID: '42', EXPECTED_ARTIFACT_ID: '12345' },
    });
    return { ...result, attempts: Number(readFileSync(countFile, 'utf8')), sleeps: readFileSync(sleepFile, 'utf8').trim().split('\n') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('Pages publication waits for the current run artifact to appear', () => {
  assert.ok(wait, 'Pages workflow needs an artifact visibility gate');
  const result = runWait(3, 1);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.attempts, 3);
  assert.deepEqual(result.sleeps, ['3', '3', '10']);
});

test('Pages publication fails after a bounded wait when the artifact stays absent', () => {
  assert.ok(wait, 'Pages workflow needs an artifact visibility gate');
  const result = runWait(0);
  assert.notEqual(result.status, 0);
  assert.equal(result.attempts, 20);
  assert.equal(result.sleeps.length, 19);
  assert.match(result.stderr, /github-pages artifact.*not visible/i);
});
