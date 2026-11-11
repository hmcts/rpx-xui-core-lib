import { expect, test } from '@playwright/test';
import { cachedTranslations } from './cache.mjs';

test('local gallery translates through its own synthetic service', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4307') external.push(request.url());
  });
  await page.goto('/translation');
  await expect(page.getByText('Local synthetic translation service')).toBeVisible();
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByTestId('translation')).toHaveText('Helo byd');
  const failure = page.waitForResponse('**/translations/failure/cy');
  await page.getByRole('link', { name: 'Try service failure' }).click();
  expect((await failure).status()).toBe(503);
  await expect(page.getByTestId('language')).toHaveText('cy');
  await expect(page.getByTestId('translation')).toHaveText('Service unavailable');
  expect(external).toEqual([]);
});

test('local gallery demonstrates a synthetic service failure', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4307') external.push(request.url());
  });
  await page.goto('/translation');
  await page.getByRole('link', { name: 'Try service failure' }).click();
  await expect(page.getByText('Simulated service failure')).toBeVisible();
  const response = page.waitForResponse('**/translations/failure/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(503);
  await expect(page.getByTestId('translation')).toHaveText('Service unavailable');
  await expect.poll(() => cachedTranslations(page)).toEqual([
    expect.objectContaining({ phrase: 'Service unavailable', lang: 'cy', translation: { translation: 'Service unavailable' } }),
  ]);
  expect(external).toEqual([]);
});

test('local translation endpoint validates requests', async ({ request }) => {
  const translated = await request.post('/translations/cy', { data: { phrases: ['Hello world', 'Unknown phrase'] } });
  expect(translated.status()).toBe(200);
  expect(await translated.json()).toEqual({ translations: { 'Hello world': 'Helo byd', 'Unknown phrase': 'Unknown phrase' } });
  expect((await request.post('/translations/cy', { data: { phrases: [123] } })).status()).toBe(400);
  expect((await request.post('/translations/cy', { data: 'not-json', headers: { 'content-type': 'application/json' } })).status()).toBe(400);
  expect((await request.get('/translations/cy')).status()).toBe(404);
  expect((await request.post('/translations/unknown', { data: { phrases: [] } })).status()).toBe(404);
});
