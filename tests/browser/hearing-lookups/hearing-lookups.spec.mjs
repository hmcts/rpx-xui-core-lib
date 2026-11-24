import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('judicial lookup supports keyboard selection and an accessible name', async ({ page }) => {
  await page.goto('/hearing-lookups');
  const input = page.getByRole('combobox', { name: 'Find a judge' });
  await expect(input).toHaveAttribute('id', 'hearing-judge');
  await expect(page.getByRole('combobox', { name: 'Secondary judge' })).toHaveAttribute('id', 'secondary-hearing-judge');
  await input.fill('alex');
  await expect(page.getByRole('option', { name: 'Alex Judge (alex.judge@example.test)' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected-judge')).toHaveText('Alex Judge');
  await expect(input).toHaveValue('Alex Judge (alex.judge@example.test)');
  const report = await new AxeBuilder({ page }).include('main').withRules(['label']).analyze();
  expect(report.violations).toEqual([]);
});

test('venue lookup supports keyboard selection and unique labelled instances', async ({ page }) => {
  await page.goto('/hearing-lookups');
  const input = page.getByRole('combobox', { name: 'Find a venue' });
  await expect(input).toHaveAttribute('id', 'hearing-venue');
  await expect(page.getByRole('combobox', { name: 'Secondary venue' })).toHaveAttribute('id', 'secondary-hearing-venue');
  await input.fill('SW1');
  await expect(page.getByRole('option', { name: 'SW1A Postcode Court' })).toBeVisible();
  await input.press('Backspace');
  await expect(page.getByRole('option', { name: 'SW1A Postcode Court' })).toHaveCount(0);
  await input.fill('synthetic');
  await expect(page.getByRole('option', { name: 'Synthetic Hearing Centre' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected-venue')).toHaveText('Synthetic Hearing Centre');
  await expect(input).toHaveValue('Synthetic Hearing Centre');
  await expect(page.getByRole('option', { name: 'No results found' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add venue' }).click();
  await expect(input).toHaveValue('');
  const report = await new AxeBuilder({ page }).include('main').withRules(['label']).analyze();
  expect(report.violations).toEqual([]);
});

test('an exact judicial name auto-selects while retaining its visible input label', async ({ page }) => {
  await page.goto('/hearing-lookups');
  const judge = page.getByRole('combobox', { name: 'Find a judge' });
  await judge.fill('Alex Judge');
  await expect(page.getByTestId('selected-judge')).toHaveText('Alex Judge');
  await expect(judge).toHaveValue('Alex Judge (alex.judge@example.test)');
});

test('an exact venue name auto-selects while retaining its visible input label', async ({ page }) => {
  await page.goto('/hearing-lookups');
  const venue = page.getByRole('combobox', { name: 'Find a venue' });
  await venue.fill('Synthetic Hearing Centre');
  await expect(page.getByTestId('selected-venue')).toHaveText('Synthetic Hearing Centre');
  await expect(venue).toHaveValue('Synthetic Hearing Centre');
});

test('duplicate exact judicial names stay visible without auto-selecting either person', async ({ page }) => {
  await page.goto('/hearing-lookups');
  const judge = page.getByRole('combobox', { name: 'Find a judge' });
  await judge.fill('Shared Judge');
  await expect(page.getByRole('option', { name: 'Shared Judge (first@example.test)' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Shared Judge (second@example.test)' })).toBeVisible();
  await expect(page.getByTestId('selected-judge')).toBeEmpty();
});

test('duplicate exact venue names stay visible without auto-selecting either venue', async ({ page }) => {
  await page.goto('/hearing-lookups');
  const venue = page.getByRole('combobox', { name: 'Find a venue' });
  await venue.fill('Shared Venue');
  await expect(page.getByRole('option', { name: 'Shared Venue', exact: true })).toHaveCount(2);
  await expect(page.getByTestId('selected-venue')).toBeEmpty();
});
