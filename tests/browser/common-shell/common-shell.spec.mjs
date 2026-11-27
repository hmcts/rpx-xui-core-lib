import { test, expect } from '@playwright/test';

test('CommonLib page shell projects content and forwards identity, banner and error-summary inputs', async ({ page }) => {
  await page.goto('/common-shell');
  await expect(page.getByRole('heading', { name: 'CommonLib shell migration' })).toBeVisible();
  await expect(page.getByText('Projected content', { exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic organisation', { exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic saved message', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle errors' }).click();
  await expect(page.getByRole('heading', { name: 'Check the form' })).toBeVisible();
  await page.getByRole('link', { name: 'Synthetic field is required' }).click();
  await expect(page.getByRole('textbox', { name: 'Synthetic field', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Toggle errors' }).click();
  await expect(page.getByRole('heading', { name: 'Check the form' })).toHaveCount(0);
});

test('event-only Back supports Enter and Space without navigation', async ({ page }) => {
  await page.goto('/common-shell');
  const back = page.locator('.govuk-back-link');
  await back.focus();
  await back.press('Enter');
  await expect(page.getByTestId('back-events')).toHaveText('1');
  await back.press('Space');
  await expect(page.getByTestId('back-events')).toHaveText('2');
  await expect(page).toHaveURL(/\/common-shell$/);
});

test('shell action callbacks support Enter and Space without navigation', async ({ page }) => {
  await page.goto('/common-shell');
  const action = page.getByRole('button', { name: 'Save action', exact: true });
  await action.focus();
  await action.press('Enter');
  await action.press('Space');
  await expect(page.getByTestId('actions')).toHaveText('2');
  await expect(page).toHaveURL(/\/common-shell$/);
});

test('routed Back remains a native link and emits its existing event once', async ({ page }) => {
  await page.goto('/common-shell?routed=1');
  const back = page.getByRole('link', { name: 'Back', exact: true });
  await expect(back).toHaveAttribute('href', '/common-shell/previous');
  await back.focus();
  await back.press('Enter');
  await expect(page).toHaveURL(/\/common-shell\/previous$/);
  await expect(page.getByTestId('back-events')).toHaveText('1');
});

test('primary navigation keeps routed links, login visibility and sanitized formatted labels', async ({ page }) => {
  await page.goto('/common-shell');
  const nav = page.getByRole('navigation', { name: 'Synthetic services' });
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'true');
  await expect(nav.locator('strong')).toHaveText('Home');
  await expect(nav.locator('[onerror], script')).toHaveCount(0);
  expect(await page.evaluate(() => Object.hasOwn(window, 'coreShellInjected'))).toBe(false);
  await nav.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/\/common-shell\/next$/);
  await expect(page.getByTestId('destination')).toHaveText('Routed destination');
  await page.getByRole('button', { name: 'Toggle login' }).click();
  await expect(nav).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle login' }).click();
  await expect(nav).toBeVisible();
});

test('table date cells render exactly one formatted value in data and row-header columns', async ({ page }) => {
  await page.goto('/common-shell');
  const table = page.getByRole('table', { name: 'Synthetic cases', exact: true });
  await expect(table.getByRole('columnheader')).toHaveText(['Case', 'Created']);
  await expect(table.locator('tbody td')).toHaveText(['27/11/2026', '26/11/2026']);
  await expect(page.getByRole('table', { name: 'Date headers', exact: true }).locator('tbody th')).toHaveText(['27/11/2026', '26/11/2026']);
  await table.getByRole('link', { name: 'Synthetic case', exact: true }).click();
  await expect(page).toHaveURL(/\/common-shell\/case$/);
});

test('Let retains its rendered view and updates falsy values without hiding the content', async ({ page }) => {
  await page.goto('/common-shell');
  const output = page.getByTestId('let-value');
  await expect(output).toHaveText('0');
  await output.evaluate(element => element.setAttribute('data-view-identity', 'original'));
  await page.getByRole('button', { name: 'Toggle Let value' }).click();
  await expect(output).toHaveText('false');
  await expect(output).toHaveAttribute('data-view-identity', 'original');
  await page.getByRole('button', { name: 'Toggle Let value' }).click();
  await expect(output).toHaveText('0');
  await expect(output).toHaveAttribute('data-view-identity', 'original');
});

test('CommonLib shell and table have no scoped automated accessibility violations', async ({ page }) => {
  await page.goto('/common-shell');
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  expect((await new AxeBuilder({ page }).include('core-test-host').analyze()).violations).toEqual([]);
});
