import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('sharing gallery starts without Angular routing errors', async ({ page }) => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/share-case');
  await expect(page.getByRole('heading', { name: 'Share cases' })).toBeVisible();
  expect(errors.filter(error => /NG04002|Cannot match any routes/.test(error))).toEqual([]);
});

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


test('simultaneous sharing forms retain separate cases', async ({ page }) => {
  await page.goto('/share-case?multiple=1');
  const forms = page.locator('xuilib-share-case');
  await expect(forms).toHaveCount(2);
  await expect(forms.nth(0).locator('.govuk-case-title')).toHaveText('Synthetic case');
  await expect(forms.nth(1).locator('.govuk-case-title')).toHaveText('Second synthetic case');
});

test('simultaneous sharing forms retain their own accessible labels', async ({ page }) => {
  await page.goto('/share-case?multiple=1');
  const forms = page.locator('xuilib-share-case');
  await expect(forms).toHaveCount(2);
  await expect(forms.nth(0).locator('xuilib-user-select input')).toHaveAccessibleName('Find a person');
  await expect(forms.nth(1).locator('xuilib-user-select input')).toHaveAccessibleName('Second recipient');
});

test('prefixed sharing forms have unique IDs and show their own errors', async ({ page }) => {
  await page.goto('/share-case?multiple=1');
  const forms = page.locator('xuilib-share-case');
  await expect(forms).toHaveCount(2);
  const duplicates = await page.locator('[id]').evaluateAll(elements => {
    const ids = elements.map(element => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicates).toEqual([]);
  await forms.nth(1).getByRole('button', { name: 'Continue' }).click();
  await expect(forms.nth(1).locator('.govuk-error-summary')).toContainText('You have not requested any changes');
  const target = forms.nth(1).locator('#second-cases');
  const link = forms.nth(1).locator('.govuk-error-summary a');
  await expect(link).toHaveAttribute('href', '#second-cases');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(target).toBeFocused();
});


test('sharing error links work with valid ID prefixes containing punctuation', async ({ page }) => {
  await page.goto('/share-case?multiple=1&prefix=second%3A');
  const form = page.locator('xuilib-share-case').nth(1);
  await form.getByRole('button', { name: 'Continue' }).click();
  const link = form.locator('.govuk-error-summary a');
  await expect(link).toHaveAttribute('href', '#second:cases');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(form.locator('[id="second:cases"]')).toBeFocused();
});


test('sharing forms distinguish the same case in each accordion', async ({ page }) => {
  await page.goto('/share-case?multiple=1&sameCase=1');
  const forms = page.locator('xuilib-share-case');
  await expect(forms).toHaveCount(2);
  const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const [index, prefix] of ['', 'second-'].entries()) {
    const form = forms.nth(index);
    const button = form.locator('.govuk-accordion__section-button');
    const contentId = `${prefix}accordion-with-summary-sections-content-case-one`;
    await expect(button).toHaveAttribute('aria-controls', contentId);
    await expect(form.locator(`[id="${contentId}"]`)).toHaveCount(1);
    await expect(form.locator(`[id="${prefix}user-full-name-0-case-one"]`)).toHaveCount(1);
  }
});
