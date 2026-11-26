import { expect, test } from '@playwright/test';

test('runtime services load their own external tags once and retain browser event contracts', async ({ page }) => {
  const externalAnalyticsRequests = [];
  await page.route('https://www.googletagmanager.com/**', async route => {
    externalAnalyticsRequests.push(route.request().url());
    await route.abort();
  });

  await page.goto('/runtime-services');
  await expect(page.getByRole('heading', { name: 'Runtime services diagnostic' })).toBeVisible();
  await page.getByRole('button', { name: 'Initialize analytics' }).click();
  await expect(page.getByTestId('analytics-ready')).toHaveText('true');

  await expect.poll(() => page.locator('script[src^="https://www.googletagmanager.com/"]').count()).toBe(2);
  expect(await page.locator('script[src^="https://www.googletagmanager.com/"]').evaluateAll(scripts => scripts.map(script => /** @type {HTMLScriptElement} */ (script).src).sort())).toEqual([
    'https://www.googletagmanager.com/gtag/js?id=G-CORE-TEST',
    'https://www.googletagmanager.com/gtm.js?id=GTM-CORE-TEST',
  ]);
  expect(await page.locator('script[src^="https://www.googletagmanager.com/"]').evaluateAll(scripts => scripts.every(script => /** @type {HTMLScriptElement} */ (script).async))).toBe(true);

  await page.getByRole('button', { name: 'Navigate to case' }).click();
  await expect.poll(() => page.evaluate(() => {
    const layer = /** @type {Window & { dataLayer?: unknown[] }} */ (window).dataLayer ?? [];
    return layer.some(entry => {
      if (typeof entry !== 'object' || entry === null) return false;
      const pageData = /** @type {{ page?: { path?: string } }} */ (entry).page;
      return pageData?.path === '/runtime-services/case/123' || (Array.isArray(entry) && entry.includes('/runtime-services/case/123'));
    });
  })).toBe(true);
  await page.getByRole('button', { name: 'Initialize session' }).click();
  await page.getByRole('button', { name: 'Emit timeout warning' }).click();
  await page.getByRole('button', { name: 'Emit session timeout' }).click();
  await expect(page.getByTestId('session-events')).toHaveText('modal:30 seconds|signout:');
  expect(externalAnalyticsRequests.sort()).toEqual([
    'https://www.googletagmanager.com/gtag/js?id=G-CORE-TEST',
    'https://www.googletagmanager.com/gtm.js?id=GTM-CORE-TEST',
  ]);
});
