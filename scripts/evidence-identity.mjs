import { execFileSync } from 'node:child_process';

export function currentIdentity(root) {
  const values = [process.env.GITHUB_SHA, process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT];
  if (values.some(Boolean) && !values.every(Boolean)) throw new Error('Incomplete CI run identity');
  const git = (...args) => execFileSync('/usr/bin/git', args, { cwd: root, encoding: 'utf8' }).trim();
  return {
    sourceSha: values[0] || git('rev-parse', 'HEAD'),
    runId: values[1] || process.env.CORE_EVIDENCE_RUN_ID || 'local',
    attempt: values[2] || '1',
    ...(process.env.CORE_EVIDENCE_RUN_ID ? { invocationId: process.env.CORE_EVIDENCE_RUN_ID } : {}),
    dirty: Boolean(git('status', '--porcelain')),
  };
}
