import assert from 'node:assert/strict';
import { expect, test } from '@playwright/test';

test('installed package keeps date and session pages lazy and usable', async ({ page }) => {
  const scripts = [];
  page.on('request', request => { const pathname = new URL(request.url()).pathname; if (pathname.endsWith('.js')) scripts.push(pathname); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Selective loading proof' })).toBeVisible();
  await expect(page.getByTestId('validity')).toHaveText('invalid');
  await page.getByRole('checkbox', { name: 'Choice' }).check();
  await expect(page.getByTestId('validity')).toHaveText('valid');
  await page.waitForLoadState('networkidle');
  const initial = [...scripts];
  const dateFile = '/' + process.env.CORE_DATE_CHUNK;
  const sessionFile = '/' + process.env.CORE_SESSION_CHUNK;
  expect(initial, 'Date chunk must not be requested before activation').not.toContain(dateFile);
  expect(initial, 'Session chunk must not be requested before activation').not.toContain(sessionFile);
  await page.getByRole('button', { name: 'Load date' }).click();
  await expect(page.getByRole('heading', { name: 'Date page' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Day' }).pressSequentially('29');
  await page.getByRole('textbox', { name: 'Month' }).pressSequentially('02');
  await page.getByRole('textbox', { name: 'Year' }).pressSequentially('2024');
  await expect(page.getByTestId('date-value')).toHaveText('2024-02-29');
  expect(scripts).toContain(dateFile);
  expect(scripts).not.toContain(sessionFile);
  await page.getByRole('button', { name: 'Load session error' }).click();
  await expect(page.getByRole('heading', { name: 'There is a problem with your session' })).toBeVisible();
  expect(scripts).toContain(sessionFile);
});

test('installed lookup uses the consuming application HTTP provider and renders results', async ({ page }) => {
  let requestBody;
  let requestMethod;
  await page.route('**/workallocation/task/search-types-of-work', async route => {
    requestMethod = route.request().method();
    requestBody = route.request().postDataJSON();
    await route.fulfill({ json: [{ key: 'appeal', label: 'Appeal' }] });
  });

  await page.goto('/');
  await page.getByRole('combobox', { name: 'Search work types' }).fill('appeal');
  const option = page.getByRole('option', { name: 'Appeal' });
  await expect(option).toBeVisible();
  await option.click();

  assert.equal(requestMethod, 'POST');
  assert.deepEqual(requestBody, { searchTerm: 'appeal' });
  await expect(page.getByTestId('selected-work-type')).toHaveText('Appeal');
});
