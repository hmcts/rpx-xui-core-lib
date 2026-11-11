import { test, expect } from '@playwright/test';
import { expireCachedTranslation, readCache } from './cache.mjs';

for (const [from, to] of [['legacy', 'core'], ['core', 'legacy']]) {
  test(`${from} to ${to} preserves valid cached translation`, async ({ page }) => {
    const requests = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/translations/cy', async (route) => {
      requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await route.fulfill({ json: { translations: { 'Hello world': 'Helo byd' } } });
    });
    await page.goto(`/?app=${from}`);
    await expect(page.getByTestId('phrase')).toHaveText('Hello world');
    await page.getByRole('button', { name: 'Cymraeg' }).click();
    await expect(page.getByTestId('phrase')).toHaveText('Helo byd');
    await expect.poll(async () => (await readCache(page)).rows.length).toBe(1);
    const before = await readCache(page);
    expect(before.version).toBe(10);
    expect(before.indexes).toContain('[phrase+lang]');
    expect(requests).toHaveLength(1);

    await page.goto(`/?app=${to}`);
    await expect(page.getByTestId('language')).toHaveText('cy');
    await expect(page.getByTestId('phrase')).toHaveText('Helo byd');
    const after = await readCache(page);
    // Observe beyond the host's 5 ms debounce for a delayed cache-miss request.
    await page.waitForTimeout(75);
    expect(requests).toHaveLength(1);
    expect(after).toEqual(before);
    expect(errors).toEqual([]);
  });
}

test('core replaces an expired cache row written by published legacy', async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/translations/cy', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { translations: { 'Hello world': requests.length === 1 ? 'Helo byd' : 'Helo newydd' } } });
  });
  await page.goto('/?app=legacy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(page.getByTestId('phrase')).toHaveText('Helo byd');
  await expect.poll(async () => (await readCache(page)).rows.length).toBe(1);
  await expireCachedTranslation(page);
  await page.goto('/?app=core');
  await expect(page.getByTestId('phrase')).toHaveText('Helo newydd');
  await expect.poll(async () => (await readCache(page)).rows.map((row) => row.translation.translation)).toEqual(['Helo newydd']);
  expect(requests).toEqual([{ phrases: ['Hello world'] }, { phrases: ['Hello world'] }]);
  expect(errors).toEqual([]);
});
