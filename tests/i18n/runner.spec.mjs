import { test, expect } from '@playwright/test';

test('loads the translation browser host without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Translation contracts');
  expect(errors).toEqual([]);
});
