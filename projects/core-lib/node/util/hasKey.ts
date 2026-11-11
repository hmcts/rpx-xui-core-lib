export function hasKey<O extends Record<string, unknown>>(obj: O, key: string): boolean {
  return key in obj;
}
