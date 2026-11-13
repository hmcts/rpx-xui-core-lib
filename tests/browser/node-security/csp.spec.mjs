import { expect, test } from '@playwright/test';
/** @type {typeof import('../../fixtures/package/node-security-host.mjs')} */
const { startCspHost } = await import(process.env.CORE_CSP_HOST_MODULE ?? new URL('../../fixtures/package/node-security-host.mjs', import.meta.url).href);

/** @param {import('@playwright/test').Response} response */
function headerNonce(response, header = 'content-security-policy') {
  return response.headers()[header]?.match(/'nonce-([^']+)'/)?.[1];
}

test('CSP enforcement runs nonce scripts and styles while blocking unapproved inline code', async ({ page }) => {
  const host = await startCspHost();
  try {
    const response = await page.goto(host.url);
    expect(response?.status()).toBe(200);
    const nonce = headerNonce(response);
    expect(nonce).toBeTruthy();
    expect(await page.locator('script[nonce]').evaluate(element => /** @type {HTMLScriptElement} */ (element).nonce)).toBe(nonce);
    await expect(page.locator('#trusted-script')).toHaveText('executed');
    await expect(page.locator('#trusted-style')).toHaveCSS('color', 'rgb(0, 128, 0)');
    await expect.poll(() => page.evaluate(() => window.cspViolations)).toContainEqual({ directive: 'script-src-elem', blocked: 'inline', disposition: 'enforce' });
    await expect(page.locator('#untrusted-script')).toHaveText('pending');
  } finally { await host.close(); }
});

test('CSP report-only emits its header and allows the identical unapproved script to execute', async ({ page }) => {
  const host = await startCspHost({ reportOnly: true });
  try {
    const response = await page.goto(host.url);
    expect(response?.status()).toBe(200);
    expect(response.headers()['content-security-policy']).toBeUndefined();
    const nonce = headerNonce(response, 'content-security-policy-report-only');
    expect(nonce).toBeTruthy();
    expect(await page.locator('script[nonce]').evaluate(element => /** @type {HTMLScriptElement} */ (element).nonce)).toBe(nonce);
    await expect(page.locator('#trusted-script')).toHaveText('executed');
    await expect(page.locator('#untrusted-script')).toHaveText('executed');
    await expect.poll(() => page.evaluate(() => window.cspViolations)).toContainEqual({ directive: 'script-src-elem', blocked: 'inline', disposition: 'report' });
  } finally { await host.close(); }
});

test('CSP reload receives a new nonce matching the served script', async ({ page }) => {
  const host = await startCspHost();
  try {
    const first = await page.goto(host.url);
    expect(first?.status()).toBe(200);
    const initial = headerNonce(first);
    expect(initial).toBeTruthy();
    await expect(page.locator('#trusted-script')).toHaveText('executed');
    const next = await page.reload();
    expect(next?.status()).toBe(200);
    const nonce = headerNonce(next);
    expect(nonce).toBeTruthy();
    expect(nonce).not.toBe(initial);
    expect(await page.locator('script[nonce]').evaluate(element => /** @type {HTMLScriptElement} */ (element).nonce)).toBe(nonce);
    await expect(page.locator('#trusted-script')).toHaveText('executed');
  } finally { await host.close(); }
});
