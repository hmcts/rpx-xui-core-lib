export async function waitForRun(page, browserErrors, timeout = 25_000) {
  try {
    await page.waitForFunction(() => globalThis.__i18nReport?.events.some(event => event.type === 'jasmineDone'), undefined, { timeout });
  } catch (error) {
    if (browserErrors.length) throw new Error(`Editor test page failed: ${browserErrors.join('; ')}`, { cause: error });
    throw error;
  }
}
