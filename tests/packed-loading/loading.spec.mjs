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
