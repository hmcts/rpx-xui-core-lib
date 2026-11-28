import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/commonlib-shell');
});

test('primary navigation is login-gated, labelled, translated and route-aware', async ({ page }) => {
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle login' }).click();

  let navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('.govuk-header__logo')).toHaveCount(1);
  await expect(navigation.getByRole('link', { name: 'Open applications' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Closed applications' })).not.toHaveAttribute('aria-current');
  await expect(navigation.getByRole('link', { name: 'Open applications' })).toHaveAttribute('href', /\/open$/);
  await expect(navigation.locator('strong')).toHaveText('Open applications');

  const translated = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await translated).status()).toBe(200);
  navigation = page.getByRole('navigation', { name: 'Prif lywio' });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ceisiadau caeedig' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yn ôl' })).toBeVisible();

  await navigation.getByRole('link', { name: 'Ceisiadau caeedig' }).click();
  await expect(page).toHaveURL(/\/closed$/);
  await expect(page.getByText('Navigation destination')).toBeVisible();

  await page.getByRole('button', { name: 'Set navigation label' }).click();
  await expect(page.getByRole('navigation', { name: 'Organisation navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle login' }).click();
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('event-only Back is keyboard-operable and emits the unchanged void event', async ({ page }) => {
  const wrapper = page.locator('xuilib-hmcts-main-wrapper').first();
  const back = wrapper.getByRole('button', { name: 'Back' });
  await expect(back).toBeVisible();
  await expect(back).toHaveCSS('appearance', 'none');
  await expect(back).toHaveCSS('border-top-style', 'none');
  await expect(back).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(wrapper.getByRole('link', { name: 'Back' })).toHaveCount(0);

  await back.focus();
  await expect(back).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByText('Back events: 1')).toBeVisible();
});

test('route Back remains a link and still emits its event', async ({ page }) => {
  await page.getByRole('button', { name: 'Use route Back' }).click();
  const back = page.locator('xuilib-hmcts-main-wrapper').first().getByRole('link', { name: 'Back' });
  await expect(back).toHaveAttribute('href', /\/cases$/);
  await back.click();
  await expect(page).toHaveURL(/\/cases$/);
  await expect(page.getByText('Back events: 1')).toBeVisible();
});

test('main wrapper preserves content, title, banner, error and action contracts', async ({ page }) => {
  const wrapper = page.locator('xuilib-hmcts-main-wrapper').first();
  await expect(wrapper.getByRole('heading', { level: 1, name: 'Case list' })).toBeVisible();
  await expect(wrapper.getByText('Projected organisation page')).toBeVisible();

  const archive = wrapper.getByRole('button', { name: 'Archive' });
  await expect(archive).toHaveClass(/hmcts-button--secondary/);
  await archive.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Action events: 1')).toBeVisible();

  await page.getByRole('button', { name: 'Show errors' }).click();
  const summary = wrapper.getByRole('alert');
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('link', { name: 'Enter a case reference' })).toHaveAttribute('href', /#case-reference$/);

  await page.getByRole('button', { name: 'Set valid summary' }).click();
  await expect(wrapper.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show banner' }).click();
  await expect(wrapper.locator('.hmcts-banner--information')).toContainText('Organisation saved');
  await expect(wrapper.locator('.hmcts-banner-title--information')).toHaveText('Saved');
  await expect(wrapper.locator('.hmcts-banner__icon--information')).toBeVisible();
  await expect(wrapper.locator('.hmcts-banner__message')).toHaveClass(/hmcts-banner__message--bold/);
});

test('main wrapper warning state replaces the error summary and passes an Axe scan', async ({ page }) => {
  await page.getByRole('button', { name: 'Show errors' }).click();
  const wrapper = page.locator('xuilib-hmcts-main-wrapper').first();
  await expect(wrapper.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle warning' }).click();
  await expect(wrapper.locator('.govuk-error-summary')).toHaveCount(0);
  await expect(wrapper.locator('.hmcts-banner--warning')).toContainText('Enter a case reference');
  await page.getByRole('button', { name: 'Toggle warning' }).click();
  await expect(wrapper.locator('.govuk-error-summary')).toBeVisible();

  await page.getByRole('button', { name: 'Toggle login' }).click();
  const result = await new AxeBuilder({ page }).include('core-commonlib-shell-host').analyze();
  expect(result.violations).toEqual([]);
});

test('a wrapper without a route or event listener does not render a Back control', async ({ page }) => {
  await page.goto('/commonlib-shell-no-back');
  const wrapper = page.locator('xuilib-hmcts-main-wrapper');
  await expect(wrapper.getByRole('heading', { name: 'No Back' })).toBeVisible();
  await expect(wrapper.getByRole('button', { name: 'Back' })).toHaveCount(0);
  await expect(wrapper.getByRole('link', { name: 'Back' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Set route Back' }).click();
  await expect(wrapper.getByRole('link', { name: 'Back' })).toHaveAttribute('href', /\/cases$/);
});
