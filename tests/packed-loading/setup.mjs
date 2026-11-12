export async function verifyLoadingHost(base, expected) {
  const response = await fetch(new URL('/__loading_identity', base), { signal: AbortSignal.timeout(5000) });
  if (!response.ok || await response.text() !== expected) throw new Error('Packed loading host identity mismatch');
}
export default async function verifyHost() {
  if (!process.env.CORE_LOADING_ID) throw new Error('Packed loading invocation identity is required');
  await verifyLoadingHost('http://127.0.0.1:14880', process.env.CORE_LOADING_ID);
}
