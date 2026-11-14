import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('selected case removal can be cancelled and reflected in confirmation', async ({ page }) => {
  await page.goto('/selected-cases');
  await expect(page.getByText('Synthetic case', { exact: true })).toBeVisible();
  const accordion = page.locator('#govuk-accordion__section-case-one button.govuk-accordion__section-button');
  if (await accordion.getAttribute('aria-expanded') === 'false') await accordion.click();
  await page.getByRole('link', { name: /Remove Alex Example from case/ }).click();
  await expect(page.getByText('To be removed')).toHaveCount(2);
  await expect(page.locator('#user-access-block-case-one')).toContainText('alex@example.invalid');
  await page.getByRole('link', { name: /Cancel/ }).click();
  await expect(page.locator('#user-access-block-case-one')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Remove Alex Example from case/ })).toBeVisible();
});

test('selected case accordion can be operated with the keyboard', async ({ page }) => {
  await page.goto('/selected-cases');
  const button = page.locator('#govuk-accordion__section-case-one button.govuk-accordion__section-button');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('selected case accordion references its own content', async ({ page }) => {
  await page.goto('/selected-cases');
  const button = page.locator('#govuk-accordion__section-case-one button.govuk-accordion__section-button');
  const controls = await button.getAttribute('aria-controls');
  expect(controls).toBe('accordion-with-summary-sections-content-case-one');
  await expect(page.locator(`[id="${controls}"]`)).toHaveCount(1);
});

test('selected case controls have no automated accessibility violations', async ({ page }) => {
  await page.goto('/selected-cases');
  const button = page.locator('#govuk-accordion__section-case-one button.govuk-accordion__section-button');
  await button.click();
  const results = await new AxeBuilder({ page }).include('#govuk-accordion__section-case-one').analyze();
  expect(results.violations).toEqual([]);
});

test('selected cases keep user identifiers unique across multiple cases', async ({ page }) => {
  await page.goto('/selected-cases?two=1');
  const first = page.locator('#govuk-accordion__section-case-one button.govuk-accordion__section-button');
  const second = page.locator('#govuk-accordion__section-case-two button.govuk-accordion__section-button');
  await first.click();
  await second.click();
  const duplicates = await page.locator('main [id]').evaluateAll(elements => {
    const ids = elements.map(element => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicates).toEqual([]);
});
