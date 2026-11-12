import { test, expect } from '@playwright/test';

test('checkbox list instances keep labels and selections independent', async ({ page }) => {
  await page.goto('/checkbox-list');
  const first = page.getByRole('region', { name: 'First list' });
  const second = page.getByRole('region', { name: 'Second list' });
  await second.getByLabel('Alpha').check();
  await expect(second.getByLabel('Alpha')).toBeChecked();
  await expect(first.getByLabel('Alpha')).not.toBeChecked();
  await expect(page.getByTestId('second-selection')).toHaveText('Alpha');
  await expect(page.getByTestId('first-selection')).toHaveText('');
});

test('checkbox list supports keyboard selection and select-all transitions', async ({ page }) => {
  await page.goto('/checkbox-list');
  const first = page.getByRole('region', { name: 'First list' });
  const alpha = first.getByLabel('Alpha');
  await alpha.focus();
  await page.keyboard.press('Space');
  await expect(alpha).toBeChecked();
  await expect(page.getByTestId('first-selection')).toHaveText('Alpha');
  const all = first.getByLabel('Select all / Deselect all');
  await all.focus();
  await page.keyboard.press('Space');
  await expect(first.getByLabel('Beta')).toBeChecked();
  await expect(page.getByTestId('first-selection')).toHaveText('Alpha,Beta');
  await page.keyboard.press('Space');
  await expect(alpha).not.toBeChecked();
  await expect(page.getByTestId('first-selection')).toHaveText('');
});
