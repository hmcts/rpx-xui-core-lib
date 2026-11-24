import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function collectVitestResults(files = [], errors = [], consoleErrors = []) {
  const tests = [];
  const visit = (task, names = []) => {
    const path = task.type === 'suite' ? [...names, task.name] : names;
    if (task.type === 'test') {
      tests.push({ fullName: [...names, task.name].join(' '), status: task.result?.state ?? 'unknown' });
    }
    for (const child of task.tasks ?? []) visit(child, path);
  };
  for (const file of files) for (const task of file.tasks ?? []) visit(task);
  const vitestVersion = JSON.parse(readFileSync(new URL('../../node_modules/vitest/package.json', import.meta.url), 'utf8')).version;
  return { schemaVersion: 1, runner: 'vitest', vitestVersion, complete: true, tests, errors: errors.map(String), consoleErrors };
}

export default class VitestEvidenceReporter {
  consoleErrors = [];

  onUserConsoleLog(log) {
    if (log.type === 'stderr') this.consoleErrors.push({ taskId: log.taskId ?? null, content: log.content });
  }

  onTestRunEnd(modules, errors) {
    const output = process.env.XUI_VITEST_RECEIPT;
    if (!output) throw new Error('XUI_VITEST_RECEIPT is required for contract evidence');
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(collectVitestResults(modules.map(module => module.task), errors, this.consoleErrors), null, 2) + '\n');
  }
}
