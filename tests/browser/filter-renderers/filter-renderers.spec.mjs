import { expect, test } from '@playwright/test';

const alpha = { key: 'A', label: 'Alpha service' };
const beta = { key: 'B', label: 'Beta service' };

async function expectValue(page, name, value) {
  await expect.poll(async () => JSON.parse(await page.getByTestId(name).innerText())).toEqual(value);
}

test('SearchService binds native disabled, two-way terms, visibility, selected keys and option objects', async ({ page }) => {
  await page.goto('/filter-renderers?mode=search');
  const input = page.locator('exui-search-service #inputServiceSearch');
  await expect(input).toHaveAccessibleName('Search services');
  await expect(input).toHaveValue('Initial service search');
  await expect(input).toBeDisabled();
  for (const state of ['False', 'Null', 'Undefined']) {
    await page.getByRole('button', { name: 'True', exact: true }).click();
    await expect(input).toBeDisabled();
    await page.getByRole('button', { name: state, exact: true }).click();
    await expect(input).toBeEnabled();
    await expect(input).not.toHaveAttribute('disabled');
  }

  await input.fill('AL');
  await expect(page.getByTestId('term')).toHaveText('AL');
  await expect(page.getByRole('option')).toHaveText(['Alpha service', 'Gamma service']);
  await input.fill('aLp');
  await expect(page.getByRole('option')).toHaveText(['Alpha service']);
  await input.press('Enter');
  await expectValue(page, 'selection', alpha);
  await expect(page.getByTestId('selection-count')).toHaveText('1');

  await input.fill('unmatched');
  await expect(page.getByRole('option')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show empty result' }).click();
  await input.fill('another unmatched term');
  await expect(page.getByRole('option', { name: 'No results found' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByTestId('term')).toBeEmpty();
  await expectValue(page, 'term-events', ['AL', 'aLp', 'unmatched', 'another unmatched term', '']);
});

test('FindService exposes the service label, native disabling, Add and the Select All display tag', async ({ page }) => {
  await page.goto('/filter-renderers?mode=service');
  const renderer = page.locator('xuilib-find-service');
  const input = renderer.locator('exui-search-service #inputServiceSearch');
  const add = renderer.locator('#add-service');
  await expect(input).toHaveAccessibleName('Search for a service');
  await expect(add).toHaveAccessibleName('Add service');
  await page.getByRole('button', { name: 'Toggle native disabled' }).click();
  await expect(input).toBeDisabled();
  await page.getByRole('button', { name: 'Toggle native disabled' }).click();
  await expect(input).toBeEnabled();

  await input.fill('all');
  await expect(page.getByRole('option', { name: 'All', exact: true })).toBeVisible();
  await input.press('Enter');
  await expectValue(page, 'service-form', []);
  await add.focus();
  await add.press('Enter');
  await expectValue(page, 'service-form', [alpha, beta]);
  await expect(input).toHaveValue('');
  const tags = renderer.locator('.hmcts-filter__tag');
  await expect(tags).toHaveText(['All']);
  await renderer.getByRole('link', { name: 'All' }).click();
  await expectValue(page, 'service-form', []);
  await expect(tags).toHaveCount(0);
  await expect(page.getByTestId('service-events')).toHaveText('2');

  await input.fill('draft');
  await page.getByRole('button', { name: 'Submit form' }).click();
  await expect(input).toHaveValue('');
});

test('single service selection commits immediately and keeps its text on submission', async ({ page }) => {
  await page.goto('/filter-renderers?mode=service&single');
  const renderer = page.locator('xuilib-find-service');
  const input = renderer.getByRole('combobox', { name: 'Search for a service' });
  await input.fill('beta');
  await expect(page.getByRole('option', { name: 'Beta service' })).toBeVisible();
  await input.press('Enter');
  await expectValue(page, 'service-form', [beta]);
  await expect(renderer.locator('#add-service')).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit form' }).click();
  await expect(input).toHaveValue('Beta service');
});

test('Work Allocation lookup uses scalar and positional codes with booking context, then clears every location', async ({ page }) => {
  await page.goto('/filter-renderers?mode=work');
  const renderer = page.locator('xuilib-find-location');
  const input = renderer.locator('exui-search-location #inputLocationSearch');
  const add = renderer.getByRole('link', { name: 'Add location' });
  const tags = renderer.locator('.location-selection a');
  await expect(input).toHaveAccessibleName('Find a work location');
  await expect(input).toBeEnabled(); // The initial reset request is independent of native disabled.

  await input.fill('court');
  await expectValue(page, 'location-lookup', {
    url: 'api/locations/getLocations', serviceIds: 'A', type: 'case-management', term: 'court',
    booking: [{ service: 'A', locations: [] }]
  });
  await page.getByRole('button', { name: 'Use checkbox services' }).click();
  await input.fill('COURT');
  await expectValue(page, 'location-lookup', {
    url: 'api/locations/getLocations', serviceIds: 'A,B', type: 'case-management', term: 'COURT',
    booking: [{ service: 'A', locations: [] }]
  });

  for (const name of ['Court Alpha', 'Court Beta', 'Court Gamma']) {
    await input.fill(name);
    await expect(page.getByRole('option')).toHaveText([name]);
    await input.press('ArrowDown');
    await input.press('Enter');
    await add.focus();
    await add.press('Enter');
    await expect(input).toHaveValue('');
  }
  await expect(tags).toHaveText(['Court Alpha', 'Court Beta', 'Court Gamma']);
  await input.fill('draft');
  await page.getByRole('button', { name: 'Toggle location reset' }).click();
  await page.getByRole('button', { name: 'Toggle location reset' }).click();
  await expect(tags).toHaveCount(0);
  await expectValue(page, 'location-form', []);
  await expect(input).toHaveValue('');
  await expect(input).toBeEnabled();

  await page.getByRole('button', { name: 'Toggle native disabled' }).click();
  await expect(input).toBeDisabled();
  await page.getByRole('button', { name: 'Toggle native disabled' }).click();
  await expect(input).toBeEnabled();
});

test('Staff Admin lookup uses service option objects and displays venue names, then resets on submission', async ({ page }) => {
  await page.goto('/filter-renderers?mode=staff');
  const renderer = page.locator('xuilib-find-location');
  const input = renderer.getByRole('combobox', { name: 'Find a work location' });
  await input.fill('aLpHa');
  await expectValue(page, 'reference-codes', ['A', 'B']);
  await expect(page.getByTestId('location-lookup')).toHaveText('null');
  await expect(page.getByRole('option')).toHaveText(['Venue Alpha']);
  await input.press('Enter');
  await renderer.getByRole('link', { name: 'Add location' }).click();
  await expect(renderer.locator('.location-selection a')).toHaveText(['Venue Alpha']);
  await expectValue(page, 'location-form', [{ epimms_id: '1', site_name: 'Court Alpha', venue_name: 'Venue Alpha' }]);

  const changes = await page.getByTestId('location-events').innerText();
  await renderer.getByRole('link', { name: 'Venue Alpha' }).click();
  await expectValue(page, 'location-form', []);
  await expect(page.getByTestId('location-events')).toHaveText(changes);
  await input.fill('draft');
  await page.getByRole('button', { name: 'Submit form' }).click();
  await expect(input).toHaveValue('');
});

test('single location selection keeps its committed text on submission', async ({ page }) => {
  await page.goto('/filter-renderers?mode=work&single');
  const renderer = page.locator('xuilib-find-location');
  const input = renderer.getByRole('combobox', { name: 'Find a work location' });
  await input.fill('Court Alpha');
  await expect(page.getByRole('option', { name: 'Court Alpha' })).toBeVisible();
  await input.press('Enter');
  await expectValue(page, 'location-form', [{ epimms_id: '1', site_name: 'Court Alpha', venue_name: 'Venue Alpha' }]);
  await expect(renderer.getByRole('link', { name: 'Add location' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit form' }).click();
  await expect(input).toHaveValue('Court Alpha');
});
