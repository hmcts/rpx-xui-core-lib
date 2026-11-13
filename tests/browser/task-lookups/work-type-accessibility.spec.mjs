import { expect, test } from '@playwright/test';

test('standalone work-type search has an accessible name', async ({ page }) => {
  await page.goto('/task-lookups');
  const input = page.locator('#inputWorkTypeSearch');
  await expect(input).toHaveAccessibleName('Search for a work type by name');
  await expect(page.getByText('Search for a work type by name', { exact: true })).toBeVisible();
  await input.fill('work');
  await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[1])).toBe(1);
});

test('standalone work-type search preserves an external label', async ({ page }) => {
  await page.goto('/task-lookups?externalWorkLabel');
  await expect(page.locator('#inputWorkTypeSearch')).toHaveAccessibleName('External custom label');
});

test('standalone work-type fallback follows the selected language', async ({ page }) => {
  await page.route('**/translations/cy', route => {
    const phrases = route.request().postDataJSON().phrases;
    return route.fulfill({ json: { translations: Object.fromEntries(phrases.map(phrase =>
      [phrase, phrase === 'Search for a work type by name' ? 'Chwilio math o waith (synthetic)' : phrase])) } });
  });
  await page.goto('/task-lookups?taskA11y');
  const input = page.locator('#inputWorkTypeSearch');
  await expect(input).toHaveAccessibleName('Search for a work type by name');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(input).toHaveAccessibleName('Chwilio math o waith (synthetic)');
  await expect(page.getByText('Chwilio math o waith (synthetic)', { exact: true })).toBeVisible();
});

test('parent work-type search uses its configured and translated title', async ({ page }) => {
  await page.route('**/translations/cy', route => {
    const phrases = route.request().postDataJSON().phrases;
    return route.fulfill({ json: { translations: Object.fromEntries(phrases.map(phrase =>
      [phrase, phrase === 'Synthetic work type title' ? 'Teitl math o waith (synthetic)' : phrase])) } });
  });
  await page.goto('/task-lookups?parent&customWorkTitle');
  const input = page.locator('#inputWorkTypeSearch');
  await expect(input).toHaveAccessibleName('Synthetic work type title');
  await expect(page.getByText('Synthetic work type title', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(input).toHaveAccessibleName('Teitl math o waith (synthetic)');
  await expect(page.getByText('Teitl math o waith (synthetic)', { exact: true })).toBeVisible();
});
