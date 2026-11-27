import { expect, test } from '@playwright/test';

const filterId = 'core-generic-filter-work';
const firstOwner = 'a'.repeat(64);
const otherOwner = 'b'.repeat(64);

function savedSetting(ownerHash) {
  return { id: filterId, ownerHash, fields: [{ name: 'service', value: ['B'] }] };
}

async function writeLocalFilter(page, ownerHash) {
  const setting = savedSetting(ownerHash);
  await page.evaluate(({ id, value }) => localStorage.setItem(id, JSON.stringify(value)), {
    id: filterId,
    value: setting,
  });
  return setting;
}

test('a local filter survives unavailable identity and restores after the same owner returns', async ({ page }) => {
  await page.goto('/generic-filter?identity=missing');
  const setting = await writeLocalFilter(page, firstOwner);
  await page.reload();
  await expect(page.getByTestId('persisted')).toHaveText('null');
  await expect.poll(() => page.evaluate(id => localStorage.getItem(id), filterId)).toBe(JSON.stringify(setting));

  await page.goto('/generic-filter?owner=first');
  await expect.poll(async () => JSON.parse(await page.getByTestId('persisted').innerText())).toEqual(setting);
});

test('a local filter is not exposed to another known owner', async ({ page }) => {
  await page.goto('/generic-filter?owner=first');
  await writeLocalFilter(page, firstOwner);

  await page.goto('/generic-filter?owner=second');

  await expect(page.getByTestId('persisted')).toHaveText('null');
  expect(await page.evaluate(id => localStorage.getItem(id), filterId)).toBeNull();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('userDetails')).filterOwnerHash)).toBe(otherOwner);
});
