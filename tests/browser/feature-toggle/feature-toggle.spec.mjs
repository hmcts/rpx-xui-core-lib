import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/feature-toggle'); });

test('feature directive shows at most one view and removes it when disabled', async ({ page }) => {
  const content = page.getByText('Feature content');
  await expect(content).toHaveCount(0);
  await page.getByRole('button', { name: 'Enable A' }).click();
  await expect(content).toHaveCount(1);
  await page.getByRole('button', { name: 'Enable A' }).click();
  await expect(content).toHaveCount(1);
  await page.getByRole('button', { name: 'Disable A' }).click();
  await expect(content).toHaveCount(0);
  await page.getByRole('button', { name: 'Enable A' }).click();
  await expect(content).toHaveCount(1);
});

test('feature directive switches subscriptions and clears stale content while waiting', async ({ page }) => {
  const content = page.getByText('Feature content');
  await page.getByRole('button', { name: 'Enable A' }).click();
  await expect(content).toHaveCount(1);
  await page.getByRole('button', { name: 'Switch to B' }).click();
  await expect(content).toHaveCount(0);
  await page.getByRole('button', { name: 'Enable B' }).click();
  await expect(content).toHaveCount(1);
  await page.getByRole('button', { name: 'Disable A' }).click();
  await expect(content).toHaveCount(1);
  await page.getByRole('button', { name: 'Disable B' }).click();
  await expect(content).toHaveCount(0);
});

test('feature directive unsubscribes on removal and subscribes again on remount', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch to B' }).click();
  await page.getByRole('button', { name: 'Toggle directive' }).click();
  await page.getByRole('button', { name: 'Enable B' }).click();
  await expect(page.getByText('Feature content')).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle directive' }).click();
  await page.getByRole('button', { name: 'Enable B' }).click();
  await expect(page.getByText('Feature content')).toHaveCount(1);
});
