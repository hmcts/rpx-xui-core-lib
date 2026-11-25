export function resolvePackedLoadingPort(raw = process.env.CORE_LOADING_PORT ?? '14880') {
  if (!/^\d{1,5}$/.test(raw)) throw new Error('CORE_LOADING_PORT must be an integer from 1024 through 65535');
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('CORE_LOADING_PORT must be an integer from 1024 through 65535');
  }
  return port;
}

export const packedLoadingPort = resolvePackedLoadingPort();
export const packedLoadingBaseUrl = `http://127.0.0.1:${packedLoadingPort}`;
