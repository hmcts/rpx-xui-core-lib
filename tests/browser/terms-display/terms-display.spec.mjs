import { test, expect } from '@playwright/test';

test('terms display renders sanitized HTML and excludes unsafe attributes', async ({page}) => {
  await page.goto('/terms-display');
  const content = page.locator('xuilib-terms-and-conditions');
  await expect(content.getByText('Synthetic terms', { exact: true })).toBeVisible();
  await expect(content.locator('strong')).toHaveText('Synthetic terms');
  await expect(content.locator('a')).toHaveAttribute('href', /^unsafe:/);
  await expect(content.locator('script')).toHaveCount(0);
});

test('terms display treats plain text as text and handles unsupported MIME types', async ({page}) => {
  await page.goto('/terms-display');
  await page.getByRole('button', {name: 'Plain text'}).click();
  const content = page.locator('xuilib-terms-and-conditions');
  await expect(content).toContainText('<strong>Synthetic text</strong>');
  await expect(content.locator('strong')).toHaveCount(0);
  await page.getByRole('button', {name: 'Unsupported'}).click();
  await expect(content).toContainText('An error occured. Please try again.');
});

test('terms display uses the shared translation service for language changes', async ({page}) => {
  await page.goto('/terms-display');
  await page.getByRole('button', {name: 'Plain text'}).click();
  await page.getByRole('button', {name: 'Cymraeg'}).click();
  await expect(page.locator('xuilib-terms-and-conditions')).toContainText('Testun synthetig');
  await page.getByRole('button', {name: 'English'}).click();
  await expect(page.locator('xuilib-terms-and-conditions')).toContainText('<strong>Synthetic text</strong>');
});


test('translated HTML is rendered through Angular sanitization', async ({page}) => {
  await page.goto('/terms-display');
  await page.getByRole('button', {name: 'Trace sanitizer'}).click();
  await page.getByRole('button', {name: 'Cymraeg'}).click();
  const content = page.locator('xuilib-terms-and-conditions');
  await expect(page.getByTestId('sanitized-input')).toContainText('Telerau synthetig');
  await expect(content.locator('strong')).toHaveText('Telerau synthetig');
  await expect(content.locator('script')).toHaveCount(0);
});
