import { test, expect } from '@playwright/test';

test('address lookup uses the external endpoint and writes the selected public model', async ({ page }) => {
  let requestedUrl;
  await page.route('**/external/addresses?postcode=SW1A2AA', async route => {
    requestedUrl = new URL(route.request().url()).pathname + new URL(route.request().url()).search;
    await route.fulfill({ json: { results: [{ DPA: {
      CLASSIFICATION_CODE: 'CM', BUILDING_NUMBER: '10', THOROUGHFARE_NAME: 'DOWNING STREET', POST_TOWN: 'LONDON', POSTCODE: 'SW1A 2AA',
    } }] } });
  });
  await page.goto('/address');
  await page.getByLabel('Enter a UK postcode').fill('sw1a 2aa');
  await page.getByRole('button', { name: 'Find address' }).click();
  await expect(page.getByLabel('Select an address')).toContainText('10 Downing Street, London');
  await expect(page.getByLabel('Select an address')).toBeFocused();
  await page.getByLabel('Select an address').selectOption({ label: '10 Downing Street, London' });

  const selectedAddress = JSON.parse(await page.getByTestId('address-value').innerText());
  expect(selectedAddress.addressLine1).toBe('10 Downing Street');
  expect(selectedAddress.postCode).toBe('SW1A 2AA');
  expect(selectedAddress.country).toBe('United Kingdom');
  await expect(page.getByTestId('selected-count')).toHaveText('1');
  await expect(page.getByTestId('reset-count')).toHaveText('1');
  expect(requestedUrl).toBe('/external/addresses?postcode=SW1A2AA');
});

test('address lookup presents the empty state after an unsuccessful request', async ({ page }) => {
  await page.route('**/external/addresses?postcode=ZZ11ZZ', route => route.fulfill({ status: 500, body: 'unavailable' }));
  await page.goto('/address');
  await page.getByLabel('Enter a UK postcode').fill('ZZ1 1ZZ');
  await page.getByRole('button', { name: 'Find address' }).click();
  await expect(page.getByLabel('Select an address')).toContainText('No address found');
});

test('address entry has no automated accessibility violations', async ({ page }) => {
  await page.goto('/address');
  await page.getByRole('link', { name: "I can't enter a UK postcode" }).click();
  await expect(page.getByRole('group', { name: 'Enter address details' })).toBeVisible();
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('main').analyze();
  expect(result.violations).toEqual([]);
});
