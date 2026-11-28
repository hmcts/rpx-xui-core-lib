import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/hmcts-shell');
  await expect(page.getByRole('heading', { name: 'Case management' })).toBeVisible();
});

test('sub-navigation exposes its label, active page, item links and roundel', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Case tasks' });
  await expect(navigation.getByRole('link', { name: 'Open cases 3' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Closed cases' })).not.toHaveAttribute('aria-current');
  await expect(navigation.getByRole('link', { name: 'Open cases 3' })).toHaveAttribute('href', /\/cases\/open$/);
});

test('error summary focuses the summary, links to a present field and reports missing targets as text', async ({ page }) => {
  const originalTitle = await page.title();
  await page.getByRole('button', { name: 'Show errors' }).click();

  const summary = page.getByRole('alert');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(page).toHaveTitle(`Error: ${originalTitle}`);
  const caseReferenceLink = summary.getByRole('link', { name: 'Enter the case reference' });
  await expect(caseReferenceLink).toBeVisible();
  await expect(caseReferenceLink).toHaveAttribute('href', /#case-reference$/);
  await expect(summary.getByRole('link', { name: 'Enter the second case reference' })).toBeVisible();
  await expect(summary.getByText('A field that is not on this page')).toBeVisible();

  await summary.getByRole('link', { name: 'Enter the case reference' }).click();
  await expect(page.locator('#case-reference')).toBeFocused();
  await summary.getByRole('link', { name: 'Enter the second case reference' }).click();
  await expect(page.locator('#case\\:reference')).toBeFocused();
});

test('clearing errors hides the summary and removes only the error title prefix', async ({ page }) => {
  const originalTitle = await page.title();
  await page.getByRole('button', { name: 'Show errors' }).click();
  await expect(page).toHaveTitle(`Error: ${originalTitle}`);

  await page.getByRole('button', { name: 'Clear errors' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page).toHaveTitle(originalTitle);
});

test('warning state does not expose an error summary or change the page title', async ({ page }) => {
  const originalTitle = await page.title();
  await page.getByRole('button', { name: 'Show warning' }).click();

  await expect(page.getByText('Warning', { exact: true })).toBeVisible();
  await expect(page.getByText('A service notice is active')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveClass(/hmcts-banner--warning/);
  await expect(page).toHaveTitle(originalTitle);
});

test('HMCTS shell controls have no automated accessibility violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Show errors' }).click();
  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(results.violations).toEqual([]);
});

test('main wrapper projects content, shows validation feedback and exposes event-only back as a button', async ({ page }) => {
  const wrapper = page.locator('xuilib-hmcts-main-wrapper');
  await expect(wrapper).toBeVisible();
  await expect(wrapper.getByRole('heading', { level: 1, name: 'Case management' })).toBeVisible();
  await expect(wrapper.getByText('Wrapper projected content')).toBeVisible();

  await page.getByRole('button', { name: 'Show wrapper errors' }).click();
  await expect(wrapper.getByRole('alert')).toContainText('Enter the organisation name');
  await expect(wrapper.getByRole('alert')).toBeFocused();

  const back = wrapper.getByRole('button', { name: 'Back' });
  await expect(back).toBeVisible();
  await back.focus();
  await expect(back).toBeFocused();
  await back.press('Enter');
  await expect(page.getByText('Back events: 1')).toBeVisible();
});

test('main wrapper uses a route link when configured and still emits its back event', async ({ page }) => {
  const wrapper = page.locator('xuilib-hmcts-main-wrapper');
  await page.getByRole('button', { name: 'Enable route back link' }).click();
  const back = wrapper.getByRole('link', { name: 'Back' });
  await expect(back).toHaveAttribute('href', /\/hmcts-shell$/);
  await back.click();
  await expect(page).toHaveURL(/\/hmcts-shell$/);
  await expect(page.getByText('Back events: 1')).toBeVisible();
});

test('main wrapper renders its banner input and action buttons as keyboard-operable controls', async ({ page }) => {
  const wrapper = page.locator('xuilib-hmcts-main-wrapper');
  await page.getByRole('button', { name: 'Show wrapper banner' }).click();
  await expect(wrapper.getByText('Organisation updated')).toBeVisible();

  const action = wrapper.getByRole('button', { name: 'Review details' });
  await action.focus();
  await expect(action).toBeFocused();
  await action.press('Enter');
  await expect(page.getByText('Action events: 1')).toBeVisible();
});

test('primary navigation is limited to signed-in users and exposes active and inactive route links', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Service navigation' });
  await expect(navigation.getByRole('link', { name: 'Organisations' })).toHaveAttribute('aria-current', 'true');
  await expect(navigation.getByRole('link', { name: 'Users' })).not.toHaveAttribute('aria-current');
  await expect(navigation.getByRole('link', { name: 'Organisations' })).toHaveAttribute('href', /\/organisations$/);
  await page.getByRole('button', { name: 'Toggle branded header' }).click();
  await expect(navigation.locator('.govuk-header__logo')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear navigation label' }).click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('.hmcts-primary-navigation')).toHaveCount(0);
});

test('main wrapper and primary navigation have no serious automated accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).include('core-hmcts-shell-host').analyze();
  expect(results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
