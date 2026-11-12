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

test('explicit labels preserve caller context and distinct input identifiers', async ({page}) => {
  await page.goto('/search-location?contract=1');
  const booking = page.getByRole('combobox', {name:'Booking location'});
  await expect(booking).toHaveAttribute('id', 'inputLocationSearch');
  await expect(page.getByRole('combobox', {name:'Work location'})).toHaveAttribute('id', 'work-location');
  await expect(page.getByRole('combobox', {name:'External location'})).toHaveAttribute('id', 'external-location');
  await expect(page.locator('#external-location')).not.toHaveAttribute('aria-label');
  const report = await new AxeBuilder({page}).include('main').withRules(['label']).analyze();
  expect(report.violations).toEqual([]);
  await booking.focus(); await page.keyboard.type('syn');
  await expect(page.getByRole('option', {name:'Synthetic Court'})).toBeVisible();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected')).toHaveText('Synthetic Court');
});

test('changing, clearing and removing a supplied label updates the input name', async ({page}) => {
  await page.goto('/search-location?contract=1');
  const input = page.locator('#inputLocationSearch');
  await expect(input).toHaveAccessibleName('Booking location');
  await page.getByRole('button', {name:'Change name'}).click();
  await expect(input).toHaveAccessibleName('Changed booking location');
  await page.getByRole('button', {name:'Clear name'}).click();
  await expect(input).not.toHaveAttribute('aria-label'); await expect(input).toHaveAccessibleName('');
  await page.getByRole('button', {name:'Remove name'}).click();
  await expect(input).not.toHaveAttribute('aria-label'); await expect(input).toHaveAccessibleName('');
  await expect(page.getByRole('combobox', {name:'External location'})).toBeVisible();
});

test('synthetic Welsh responses update explicit names without replacing an external label', async ({page}) => {
  await page.route('**/translations/cy', async route => {
    const {phrases} = route.request().postDataJSON();
    const translations = Object.fromEntries(phrases.map(phrase => [phrase, phrase === 'Booking location' ? 'Lleoliad archebu' : phrase === 'Work location' ? 'Lleoliad gwaith' : phrase]));
    await route.fulfill({json:{translations}});
  });
  await page.goto('/search-location?contract=1');
  await expect(page.getByRole('combobox', {name:'Booking location'})).toBeVisible();
  await page.getByRole('button', {name:'Cymraeg'}).click();
  await expect(page.getByRole('combobox', {name:'Lleoliad archebu'})).toBeVisible();
  await expect(page.getByRole('combobox', {name:'Lleoliad gwaith'})).toBeVisible();
  await expect(page.getByRole('combobox', {name:'External location'})).toBeVisible();
});


test('blank opt-in preserves the external name and explicit text takes precedence', async ({page}) => {
  await page.goto('/search-location?contract=1');
  const input = page.locator('#external-location');
  await expect(input).toHaveAccessibleName('External location');
  await page.getByRole('button', {name:'Blank external name'}).click();
  await expect(input).toHaveAccessibleName('External location');
  await expect(input).not.toHaveAttribute('aria-label');
  await page.getByRole('button', {name:'Override external name'}).click();
  await expect(input).toHaveAccessibleName('Override location');
  await expect(input).toHaveAttribute('aria-label', 'Override location');
});
