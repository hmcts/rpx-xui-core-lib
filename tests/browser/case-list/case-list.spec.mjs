import { expect, test } from '@playwright/test';

test('case list renders configured columns and selects a case once with the keyboard', async ({ page }) => {
  await page.goto('/case-list');
  const table = page.getByRole('table', { name: 'Primary cases' });
  await expect(table.getByRole('columnheader', { name: 'Case reference' })).toBeVisible();
  await expect(table.getByText('Synthetic Case One', { exact: true })).toBeVisible();

  const checkbox = page.getByRole('checkbox', { name: 'Select case case-1001' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await expect(page.getByTestId('selected-count')).toHaveText('1');
});

test('case list emits the page selection and displays the requested page', async ({ page }) => {
  await page.goto('/case-list');
  const table = page.getByRole('table', { name: 'Primary cases' });
  const pagination = page.getByRole('navigation', { name: 'Pagination' });
  await pagination.locator('[aria-label="Next page"]').click();
  await expect(page.getByTestId('page')).toHaveText('2');
  await expect(table.getByText('Synthetic Case Three', { exact: true })).toBeVisible();
  await expect(table.getByText('Synthetic Case One', { exact: true })).toHaveCount(0);
});

test('case list exposes accessible selection names and has no duplicate checkbox IDs', async ({ page }) => {
  await page.goto('/case-list');
  await expect(page.getByRole('checkbox', { name: 'Select all cases in this list' })).toHaveCount(4);
  await expect(page.getByRole('checkbox', { name: 'Select case case-2001' })).toBeVisible();

  const duplicateIds = await page.locator('input[type="checkbox"][id]').evaluateAll(inputs => {
    const ids = inputs.map(input => input.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicateIds).toEqual([]);

  const emptyTable = page.getByRole('table', { name: 'Empty cases' });
  const unspecifiedTable = page.getByRole('table', { name: 'Unspecified cases' });
  for (const table of [emptyTable, unspecifiedTable]) {
    const selectAll = table.getByRole('checkbox', { name: 'Select all cases in this list' });
    await expect(selectAll).toBeDisabled();
    await expect(selectAll).not.toBeChecked();
    await expect(table.locator('tbody tr')).toHaveCount(0);
  }

  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('main').analyze();
  expect(result.violations).toEqual([]);
});

test('case identifiers stay local when translating accessible selection labels', async ({ page }) => {
  await page.goto('/case-list');
  const translationRequest = page.waitForRequest('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  const { phrases } = (await translationRequest).postDataJSON();
  expect(phrases).not.toContain('Select case case-1001');
  expect(phrases).toContain('Select case');
  await expect(page.getByRole('checkbox', { name: 'Dewis achos case-1001' })).toBeVisible();
});


test('case selection and select-all remain independent between list instances', async ({ page }) => {
  await page.goto('/case-list');
  const primary = page.getByRole('table', { name: 'Primary cases' });
  const secondary = page.getByRole('table', { name: 'Secondary cases' });

  await secondary.getByRole('checkbox', { name: 'Select case case-2001' }).check();
  await expect(page.getByTestId('secondary-selected-count')).toHaveText('1');
  await expect(page.getByTestId('selected-count')).toHaveText('0');

  await primary.getByRole('checkbox', { name: 'Select all cases in this list' }).check();
  await expect(page.getByTestId('selected-count')).toHaveText('3');
  await expect(page.getByTestId('secondary-selected-count')).toHaveText('1');

  const empty = page.getByRole('table', { name: 'Empty cases' });
  await expect(empty.getByRole('checkbox', { name: 'Select all cases in this list' })).toBeDisabled();
  await expect(empty.locator('tbody tr')).toHaveCount(0);
});
