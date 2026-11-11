// Producers write these receipts immediately after their own test process.
// These hashes correlate files; they do not authenticate the producer or run.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inventory = JSON.parse(readFileSync(new URL('../tests/contracts.json', import.meta.url), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function makeLaneReceipt(lane, identity, raw, completed) {
  if (!Object.hasOwn(inventory, lane)) throw new Error('Unknown evidence lane');
  return { schemaVersion: 1, lane, ...identity, completed, reportSha256: digest(raw) };
}

export function verifyBoundEvidence(root, expected) {
  const run = JSON.parse(readFileSync(resolve(root, 'test-results/lane-provenance/run.json'), 'utf8'));
  if (!/^[a-f0-9-]{36}$/.test(run.invocationId ?? '') || !/^[a-f0-9]{64}$/.test(run.sourceSnapshot ?? '') || ['sourceSha', 'runId', 'attempt'].some(key => run[key] !== expected[key])) throw new Error('Mismatched evidence invocation');
  for (const [lane, config] of Object.entries(inventory)) {
    const reportPath = resolve(root, config.report);
    const receiptPath = resolve(root, 'test-results/lane-provenance', `${lane}.json`);
    if (!lstatSync(reportPath).isFile() || !lstatSync(receiptPath).isFile()) throw new Error(`Invalid ${lane} evidence file`);
    const raw = readFileSync(reportPath);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    if (receipt.schemaVersion !== 1 || receipt.lane !== lane || receipt.completed !== true || ['sourceSha', 'runId', 'attempt'].some(key => receipt[key] !== expected[key]) || receipt.invocationId !== run.invocationId || receipt.sourceSnapshot !== run.sourceSnapshot || receipt.reportSha256 !== digest(raw)) throw new Error(`Unbound ${lane} evidence`);
  }
}
