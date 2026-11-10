import { test, expect } from '@playwright/test';
import { cachedTranslations } from './cache.mjs';
import { holdWelshTranslation } from './translation-api.mjs';

test('locale switches reuse persisted translations across English and page reloads', async ({ page, context }) => {
  const requests = [];
  await page.route('**/translations/cy', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { translations: { 'Hello world': 'Helo byd' } } });
  });
  await page.goto('/translation');
  await expect(page.getByTestId('translation')).toHaveText('Hello world');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(page.getByTestId('translation')).toHaveText('Helo byd');
  await expect.poll(() => cachedTranslations(page)).toEqual([
    expect.objectContaining({ phrase: 'Hello world', lang: 'cy', translation: { translation: 'Helo byd' } }),
  ]);
  expect(requests).toEqual([{ phrases: ['Hello world'] }]);
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByTestId('translation')).toHaveText('Hello world');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(page.getByTestId('translation')).toHaveText('Helo byd');
  await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === 'exui-preferred-language')?.value).toBe('cy');
  await page.reload();
  await expect(page.getByTestId('language')).toHaveText('cy');
  await expect(page.getByTestId('translation')).toHaveText('Helo byd');
  expect(requests).toHaveLength(1);
});

test('a translation HTTP failure returns and caches the original phrase', async ({ page }) => {
  await page.route('**/translations/cy', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.goto('/translation');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(page.getByTestId('language')).toHaveText('cy');
  await expect.poll(() => cachedTranslations(page)).toEqual([
    expect.objectContaining({ phrase: 'Hello world', lang: 'cy', translation: { translation: 'Hello world' } }),
  ]);
  await expect(page.getByTestId('translation')).toHaveText('Hello world');
});

test('a late Welsh response preserves English and is reused after switching back', async ({ page }) => {
  const held = await holdWelshTranslation(page);
  await page.goto('/translation');
  await expect(page.getByTestId('translation')).toHaveText('Hello world');
  const requested = page.waitForRequest('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await requested;
  await expect(page.getByTestId('language')).toHaveText('cy');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByTestId('translation')).toHaveText('Hello world');
  held.release();
  await expect.poll(() => cachedTranslations(page)).toEqual([
    expect.objectContaining({ phrase: 'Hello world', lang: 'cy', translation: { translation: 'Helo byd' } }),
  ]);
  await expect(page.getByTestId('language')).toHaveText('en');
  await expect(page.getByTestId('translation')).toHaveText('Hello world');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(page.getByTestId('translation')).toHaveText('Helo byd');
  expect(held.requests).toEqual([{ phrases: ['Hello world'] }]);
});
