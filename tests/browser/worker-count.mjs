import { availableParallelism } from 'node:os';

export function ciWorkerCount(availableCpus = availableParallelism()) {
  return Math.max(1, Math.min(6, availableCpus - 2));
}
