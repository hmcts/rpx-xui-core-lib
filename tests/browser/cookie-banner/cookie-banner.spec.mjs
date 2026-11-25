import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('cookie consent banner has a translated accessible name and a working details link', async ({ page }) => {
  await page.goto('/cookie-banner');
  const banner = page.getByRole('region', { name: 'Cookies on Case service' });
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('heading', { name: 'Cookies on Case service' })).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Accept analytics cookies' })).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Reject analytics cookies' })).toBeVisible();
  const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
  expect((await new AxeBuilder({ page }).include('xuilib-cookie-banner').withTags(axeTags).analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(page.getByRole('region', { name: 'Cwcis ar Gwasanaeth achosion' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cwcis ar Gwasanaeth achosion' })).toBeVisible();
  await page.getByRole('link', { name: 'Gweld cwcis' }).click();
  await expect(page).toHaveURL(/\/cookies$/);
  await expect(page.getByRole('heading', { name: 'Cookie details' })).toBeVisible();
});

test('cookie details route loads directly in the cookie banner gallery', async ({ page }) => {
  await page.goto('/cookies');

  await expect(page.getByRole('heading', { name: 'Cookie details' })).toBeVisible();
});

test('accepting analytics consent stores it for a year and enables opted-in Dynatrace after consent', async ({ page, context }) => {
  await page.addInitScript(() => {
    const readCalls = () => JSON.parse(localStorage.getItem('synthetic-dtrum-calls') ?? '{"enable":0,"replay":0}');
    const writeCalls = calls => localStorage.setItem('synthetic-dtrum-calls', JSON.stringify(calls));
    /** @type {Window & typeof globalThis & { dtrum?: { enable(): void; enableSessionReplay(enabled: boolean): void } }} */
    const instrumentedWindow = window;
    instrumentedWindow.dtrum = {
      enable: () => { const calls = readCalls(); calls.enable += 1; writeCalls(calls); },
      enableSessionReplay: enabled => { if (enabled) { const calls = readCalls(); calls.replay += 1; writeCalls(calls); } },
    };
  });
  await page.goto('/cookie-banner');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('synthetic-dtrum-calls') ?? '{"enable":0,"replay":0}'))).toEqual({ enable: 0, replay: 0 });

  const consentClickStartedAt = Date.now();
  await page.getByRole('button', { name: 'Accept analytics cookies' }).click();
  const consentClickCompletedAt = Date.now();
  await expect(page.getByRole('region', { name: 'Cookies on Case service' })).toBeHidden();
  await expect(page.getByTestId('cookie-decision')).toHaveText('accepted');
  const cookie = (await context.cookies()).find(item => item.name === 'core-cookie-banner-consent');
  expect(cookie?.value).toBe('true');
  const earliestExpectedExpiry = Math.floor((consentClickStartedAt + 31536000000) / 1000);
  const latestExpectedExpiry = Math.floor((consentClickCompletedAt + 31536000000) / 1000);
  expect(cookie?.expires).toBeGreaterThanOrEqual(earliestExpectedExpiry);
  expect(cookie?.expires).toBeLessThanOrEqual(latestExpectedExpiry);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('synthetic-dtrum-calls')))).toEqual({ enable: 2, replay: 2 });
});

test('rejecting analytics consent persists false and does not enable Dynatrace', async ({ page, context }) => {
  await page.addInitScript(() => {
    /** @type {Window & typeof globalThis & { dtrum?: { enable(): void; enableSessionReplay(enabled: boolean): void } }} */
    const instrumentedWindow = window;
    instrumentedWindow.dtrum = { enable: () => { throw new Error('must not enable before consent'); }, enableSessionReplay: () => { throw new Error('must not enable before consent'); } };
  });
  await page.goto('/cookie-banner');
  await page.getByRole('button', { name: 'Reject analytics cookies' }).click();
  await expect(page.getByRole('region', { name: 'Cookies on Case service' })).toBeHidden();
  await expect(page.getByTestId('cookie-decision')).toHaveText('rejected');
  expect((await context.cookies()).find(item => item.name === 'core-cookie-banner-consent')?.value).toBe('false');
});
