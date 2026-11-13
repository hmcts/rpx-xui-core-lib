import { expect, test } from '@playwright/test';
import { readCache } from '../cache-upgrade/cache.mjs';

const translated = phrases => ({ translations: Object.fromEntries(phrases.map(phrase => [phrase, phrase === 'Shared phrase' ? 'Ymadrodd a rennir' : `Cy: ${phrase}`])) });

test('installed Translation counterpart shares providers, requests and browser cache with Core', async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/synthetic/cy', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: translated(route.request().postDataJSON().phrases) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load translation' }).click();
  await expect(page.getByTestId('counterpart-identity')).toHaveText('shared');
  await expect(page.getByTestId('core-phrase')).toHaveText('Shared phrase');
  await expect(page.getByTestId('legacy-phrase')).toHaveText('Shared phrase');
  await page.getByRole('button', { name: 'Shared Welsh' }).click();
  await expect(page.getByTestId('core-phrase')).toHaveText('Ymadrodd a rennir');
  await expect(page.getByTestId('legacy-phrase')).toHaveText('Ymadrodd a rennir');
  await page.waitForLoadState('networkidle');
  expect(requests.flatMap(request => request.phrases).sort()).toEqual(['Search work types', 'Shared phrase']);
  await expect(page.getByRole('combobox', { name: 'Cy: Search work types' })).toBeVisible();
  await expect.poll(async () => (await readCache(page)).rows.filter(row => row.phrase === 'Shared phrase').length).toBe(1);
  const before = await readCache(page);
  const requestCount = requests.length;
  await page.getByRole('button', { name: 'Toggle shared child' }).click();
  await expect(page.getByTestId('legacy-phrase')).toHaveCount(0);
  await expect(page.getByTestId('core-phrase')).toHaveText('Ymadrodd a rennir');
  await page.getByRole('button', { name: 'Toggle shared child' }).click();
  await expect(page.getByTestId('legacy-phrase')).toHaveText('Ymadrodd a rennir');
  await page.reload();
  await page.getByRole('button', { name: 'Load translation' }).click();
  await expect(page.getByTestId('legacy-phrase')).toHaveText('Ymadrodd a rennir');
  await expect(page.getByTestId('core-phrase')).toHaveText('Ymadrodd a rennir');
  await page.waitForLoadState('networkidle');
  expect(await readCache(page)).toEqual(before);
  expect(requests).toHaveLength(requestCount);
  await page.getByRole('button', { name: 'Shared English' }).click();
  await expect(page.getByTestId('core-phrase')).toHaveText('Shared phrase');
  await expect(page.getByTestId('legacy-phrase')).toHaveText('Shared phrase');
  expect(errors).toEqual([]);
});

test('installed Translation counterpart cancels its scoped owner without destroying the Core root', async ({ page }) => {
  let held;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/synthetic/cy', async route => {
    if (route.request().postDataJSON().phrases.includes('Scoped phrase')) { held = route; return; }
    await route.fulfill({ json: translated(route.request().postDataJSON().phrases) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load translation' }).click();
  await page.getByRole('button', { name: 'Show scoped owner' }).click();
  await expect(page.getByTestId('scoped-identity')).toHaveText('independent');
  await page.getByRole('button', { name: 'Scoped Welsh' }).click();
  await expect.poll(() => Boolean(held)).toBe(true);
  const cancelled = page.waitForEvent('requestfailed', request => request.url().endsWith('/synthetic/cy') && request.postDataJSON().phrases.includes('Scoped phrase'));
  await page.getByRole('button', { name: 'Destroy scoped owner' }).click();
  await cancelled;
  await expect(page.getByTestId('scoped-phrase')).toHaveCount(0);
  expect((await readCache(page)).rows.filter(row => row.phrase === 'Scoped phrase')).toEqual([]);
  await page.getByRole('button', { name: 'Shared Welsh' }).click();
  await expect(page.getByTestId('core-phrase')).toHaveText('Ymadrodd a rennir');
  await expect(page.getByTestId('legacy-phrase')).toHaveText('Ymadrodd a rennir');
  expect(errors).toEqual([]);
});
