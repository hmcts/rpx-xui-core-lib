import { test, expect } from '@playwright/test';

test('keyboard checkbox toggles update real FormGroup validity and submitted errors', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Validation diagnostic pilot' })).toBeVisible();
  await expect(page.getByTestId('validity')).toHaveText('Invalid');
  await expect(page.getByTestId('values')).toHaveText('First: false; Second: false');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Select at least one role');
  const firstRole = page.getByRole('checkbox', { name: 'First role', exact: true });
  await firstRole.focus();
  await page.keyboard.press('Space');
  await expect(firstRole).toBeChecked();
  await expect(page.getByTestId('validity')).toHaveText('Valid');
  await expect(page.getByTestId('values')).toHaveText('First: true; Second: false');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(firstRole).not.toBeChecked();
  await expect(page.getByTestId('validity')).toHaveText('Invalid');
  await expect(page.getByRole('alert')).toHaveText('Select at least one role');
});
