import { expect, test } from '@playwright/test';

test('retained parent control drives lookup before and after component recreation', async ({ page }) => {
  await page.goto('/reuse-person');
  const input = page.locator('#inputSelectPersonreuse');
  await expect(input).toHaveValue('retained');
  await expect(page.getByTestId('required')).toHaveText('true');
  await input.fill('alice');
  await expect(page.getByTestId('clears')).toHaveText('1');
  await expect.poll(() => page.evaluate(() => window.reuseProbe.requestCount())).toBe(1);
  await page.getByRole('button', { name: 'Toggle component' }).click();
  await expect(input).toHaveCount(0);
  await expect(page.getByTestId('value')).toHaveText('alice');
  await page.getByRole('button', { name: 'Disable control' }).click();
  await page.getByRole('button', { name: 'Toggle component' }).click();
  await expect(input).toHaveValue('alice');
  await expect(input).toBeDisabled();
  await expect(page.getByTestId('required')).toHaveText('true');
  await page.getByRole('button', { name: 'Enable control' }).click();
  await input.fill('bob');
  await expect(page.getByTestId('clears')).toHaveText('2');
  await expect.poll(() => page.evaluate(() => window.reuseProbe.requestCount())).toBe(2);
  await page.waitForTimeout(400); // Covers a second 300ms debounce after recreation.
  await expect.poll(() => page.evaluate(() => window.reuseProbe.requestCount())).toBe(2);
});
