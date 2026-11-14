import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('sharing cannot add a person before an autocomplete selection', async ({ page }) => {
  await page.goto('/share-case');
  const add = page.getByRole('button', { name: /Add user/ });
  await expect(add).toBeDisabled();
  await page.locator('xuilib-user-select input').fill('Sam');
  await expect(add).toBeDisabled();
  await page.getByRole('option', { name: 'Sam Example - sam@example.invalid' }).click();
  await expect(add).toBeEnabled();
});

test('sharing requires a change and adds a selected user', async ({ page }) => {
  await page.goto('/share-case');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('You have not requested any changes to case sharing').first()).toBeVisible();
  const input = page.locator('xuilib-user-select input');
  await expect(page.locator('#add-user-input').getByRole('combobox')).toHaveCount(1);
  await input.fill('Sam');
  await page.getByRole('option', { name: 'Sam Example - sam@example.invalid' }).click();
  await page.getByRole('button', { name: /Add user/ }).click();
  const button = page.locator('#govuk-accordion__section-case-one button.govuk-accordion__section-button');
  if (await button.getAttribute('aria-expanded') === 'false') await button.click();
  await expect(page.getByText('Sam Example', { exact: true })).toBeVisible();
  await expect(page.getByText('To be added')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/confirmation$/);
  await expect(page.getByRole('heading', { name: 'Confirm sharing' })).toBeVisible();
  await expect(page.locator('#casesToConfirm')).toContainText('sam@example.invalid');
});

test('sharing user lookup has its visible label and accessible description', async ({ page }) => {
  await page.goto('/share-case');
  const input = page.locator('xuilib-user-select input');
  await expect(input).toHaveAccessibleName('Find a person');
  await expect(input).toHaveAccessibleDescription('Search by name or email address. You can share access with as many people as you need.');
  const results = await new AxeBuilder({ page }).include('xuilib-share-case').analyze();
  expect(results.violations).toEqual([]);
});

test('sharing preserves a caller supplied user lookup label', async ({ page }) => {
  await page.goto('/share-case?label=Choose%20recipient');
  await expect(page.locator('xuilib-user-select input')).toHaveAccessibleName('Choose recipient');
  await expect(page.getByText('Choose recipient', { exact: true }).first()).toBeVisible();
});

test('sharing refreshes a typed search when users finish loading', async ({ page }) => {
  await page.goto('/share-case?delayed=1');
  const input = page.getByRole('combobox', { name: 'Find a person' });
  await input.fill('Sam');
  await expect(page.getByRole('option', { name: 'Sam Example - sam@example.invalid' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Load users' }).click();
  await input.focus();
  await expect(page.getByRole('option', { name: 'Sam Example - sam@example.invalid' })).toBeVisible();
  await expect(input).toHaveValue('Sam');
});

test('sharing can remove a selected existing user from all cases', async ({ page }) => {
  await page.goto('/share-case');
  await page.locator('#remove-user-input').selectOption({ label: 'Alex Example - alex@example.invalid' });
  await page.getByRole('button', { name: /Remove user/ }).click();
  const button = page.locator('#govuk-accordion__section-case-one button.govuk-accordion__section-button');
  if (await button.getAttribute('aria-expanded') === 'false') await button.click();
  await expect(page.getByText('To be removed')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('At least one person must be assigned to each case').first()).toBeVisible();
});
