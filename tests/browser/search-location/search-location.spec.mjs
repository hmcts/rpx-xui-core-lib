import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('keyboard search presents and selects a location', async ({page}) => {
  await page.goto('/search-location?label=1');
  const search = page.getByLabel('Find a location');
  await search.focus();
  await page.keyboard.type('syn');
  await expect(page.getByRole('option', {name:'Synthetic Court'})).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected')).toHaveText('Synthetic Court');
});

// Reproduces the current booking parent's lack of a label; this is a known gap, not an accessibility pass.
test('unlabelled booking-style host exposes the existing accessible-name gap', async ({page}) => {
  await page.goto('/search-location');
  const report = await new AxeBuilder({page}).include('main').withRules(['label']).analyze();
  expect(report.violations.map(violation => violation.id)).toContain('label');
  expect(report.violations.find(violation => violation.id === 'label').nodes.some(node => node.target.includes('#inputLocationSearch'))).toBe(true);
});

test('a caller supplied label gives the location search an accessible name', async ({page}) => {
  await page.goto('/search-location?label=1');
  await expect(page.getByRole('combobox', {name:'Find a location'})).toBeVisible();
  const report = await new AxeBuilder({page}).include('main').withRules(['label']).analyze();
  expect(report.violations).toEqual([]);
});
