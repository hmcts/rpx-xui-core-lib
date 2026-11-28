import { availableParallelism } from 'node:os';

export function ciWorkerCount(availableCpus = availableParallelism()) {
  return Math.max(1, Math.min(6, availableCpus - 1));
}

export function configuredWorkerCount({ explicit = process.env.PLAYWRIGHT_WORKERS, ci = Boolean(process.env.CI), availableCpus = availableParallelism() } = {}) {
  if (explicit !== undefined) {
    if (!/^[1-9]\d*$/.test(explicit) || !Number.isSafeInteger(Number(explicit))) {
      throw new Error('PLAYWRIGHT_WORKERS must be a positive integer');
    }
    return Number(explicit);
  }

  return ci ? ciWorkerCount(availableCpus) : undefined;
}
