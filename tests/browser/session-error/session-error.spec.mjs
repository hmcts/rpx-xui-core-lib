import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('session error page shows default content and supports custom messages', async ({ page }) => {
  await page.goto('/session-error');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'There is a problem with your session' })).toBeVisible();
  await expect(page.getByText('Go to landing page. Refreshing the page. If the problem persists, sign out and sign in again.')).toBeVisible();
  await expect(page.getByText('If you still cannot access the service, clear your browser data for this website.')).toBeVisible();
  await page.getByRole('button', { name: 'Change messages' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Custom session heading' })).toBeVisible();
  await expect(page.getByText('First custom message')).toBeVisible();
  await expect(page.getByText('Second custom message')).toBeVisible();
});

test('session error page has an accessible main landmark and heading', async ({ page }) => {
  await page.goto('/session-error');
  const results = await new AxeBuilder({ page }).include('ccd-session-error-page').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await expect(page.getByRole('main')).toContainText('There is a problem with your session');
});
