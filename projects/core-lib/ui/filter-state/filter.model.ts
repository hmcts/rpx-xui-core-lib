export type FilterPersistence = 'local' | 'session' | 'memory';
export interface FilterSetting {
  id: string;
  ownerHash?: string;
  reset?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published filter value contract.
  fields: { name: string, value: any[] }[];
}
export interface FilterError {
  name: string;
  error: string;
}
