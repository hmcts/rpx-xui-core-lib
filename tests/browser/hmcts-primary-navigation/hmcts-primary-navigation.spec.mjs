import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('primary navigation is hidden from signed-out users and its links follow their routes', async ({ page }) => {
  const routeErrors = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().includes('NG04002')) routeErrors.push(message.text());
  });
  await page.goto('/hmcts-primary-navigation');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });

  await expect(nav).toBeVisible();
  expect(routeErrors).toEqual([]);
  await expect(nav.getByRole('link', { name: 'Back' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
  await page.getByRole('button', { name: 'Toggle login' }).click();
  await expect(nav).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle login' }).click();
  await nav.getByRole('link', { name: 'Profile' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Primary navigation destination')).toBeVisible();
});

test('primary navigation translates links and renders the optional branded header accessibly', async ({ page }) => {
  await page.goto('/hmcts-primary-navigation');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await page.getByRole('button', { name: 'Toggle branded header' }).click();
  await expect(nav.locator('.govuk-header__logo')).toHaveCount(1);
  await page.getByRole('button', { name: 'Toggle branded header' }).click();
  await expect(nav.locator('.govuk-header__logo')).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle branded header' }).click();
  await expect(nav.locator('.govuk-header__logo')).toHaveCount(1);

  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  const welshNav = page.getByRole('navigation', { name: 'Prif lywio' });
  await expect(welshNav).toBeVisible();
  await expect(welshNav.getByRole('link', { name: 'Yn ôl' })).toHaveAttribute('aria-current', 'page');

  const result = await new AxeBuilder({ page }).include('#core-hmcts-primary-navigation-host').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
