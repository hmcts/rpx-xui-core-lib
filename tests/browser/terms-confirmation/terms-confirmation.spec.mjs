import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('terms confirmation keeps its translation, review link and confirm event contract', async ({ page }) => {
  await page.goto('/terms-confirmation');

  const confirmation = page.locator('xuilib-tc-confirm');
  await expect(confirmation.getByRole('heading', { level: 1, name: 'Using this service' })).toBeVisible();
  await expect(confirmation.getByRole('heading', { level: 2, name: 'Terms and conditions' })).toBeVisible();
  const termsLink = confirmation.getByRole('link', { name: 'terms and conditions' });
  await expect(termsLink).toHaveAttribute('href', '/terms-and-conditions');
  await expect(termsLink).toHaveAttribute('target', '_blank');
  await expect(termsLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(confirmation.getByText("You must review and accept them.")).toBeVisible();

  const confirmButton = confirmation.getByRole('button', { name: 'Confirm' });
  await expect(confirmButton).toHaveJSProperty('type', 'submit');
  await confirmButton.click();
  await expect(page.getByTestId('confirm-event-count')).toHaveText('1');
});

test('terms confirmation translates content and passes an accessibility scan', async ({ page }) => {
  await page.goto('/terms-confirmation');
  await page.getByRole('button', { name: 'Cymraeg' }).click();

  const confirmation = page.locator('xuilib-tc-confirm');
  await expect(confirmation.getByRole('heading', { level: 1, name: 'Defnyddio’r gwasanaeth hwn' })).toBeVisible();
  await expect(confirmation.getByRole('link', { name: 'telerau ac amodau' })).toBeVisible();
  await expect(confirmation.getByRole('button', { name: 'Cadarnhau' })).toBeVisible();

  const result = await new AxeBuilder({ page }).include('xuilib-tc-confirm').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
