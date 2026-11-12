import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyHostIdentity(base, expected) {
  const response = await fetch(new URL('/__core-evidence/' + encodeURIComponent(expected.invocationId), base), { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Test host invocation identity unavailable');
  const actual = await response.json();
  if (actual.invocationId !== expected.invocationId || actual.sourceSha !== expected.sourceSha || actual.sourceSnapshot !== expected.sourceSnapshot) throw new Error('Test host invocation identity mismatch');
}

// Focused runs can be started without the supervised runner; they are not bound evidence.
export default async function verifyHost(config) {
  if (!process.env.CORE_EVIDENCE_RUN_ID) return;
  const expected = JSON.parse(await readFile(resolve('test-results/lane-provenance/run.json'), 'utf8'));
  if (expected.invocationId !== process.env.CORE_EVIDENCE_RUN_ID || !expected.sourceSnapshot) throw new Error('Missing supervised invocation identity');
  const base = config.projects[0].use.baseURL;
  if (typeof base !== 'string') throw new Error('Test host URL is missing');
  await verifyHostIdentity(base, expected);
}
