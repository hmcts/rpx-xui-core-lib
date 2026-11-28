import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('HMCTS main wrapper translates its shell, projects content, and follows its back link', async ({ page }) => {
  const routeErrors = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().includes('NG04002')) routeErrors.push(message.text());
  });
  await page.goto('/hmcts-main-wrapper');
  const wrapper = page.locator('xuilib-hmcts-main-wrapper');

  await expect(wrapper.getByRole('heading', { level: 1, name: 'Case list' })).toBeVisible();
  expect(routeErrors).toEqual([]);
  await expect(wrapper.getByText('Projected wrapper content')).toBeVisible();
  await expect(wrapper.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/cases');
  await expect(wrapper.getByText('Updates saved')).toBeVisible();

  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(wrapper.getByRole('heading', { level: 1, name: 'Rhestr achosion' })).toBeVisible();
  await expect(wrapper.getByRole('link', { name: 'Yn ôl' })).toHaveAttribute('href', '/cases');
  await wrapper.getByRole('link', { name: 'Yn ôl' }).click();
  await expect(page).toHaveURL(/\/cases$/);
});

test('event-only navigation and configured actions use keyboard-operable buttons', async ({ page }) => {
  await page.goto('/hmcts-main-wrapper');
  const wrapper = page.locator('xuilib-hmcts-main-wrapper');
  await page.getByRole('button', { name: 'Use event back action' }).click();

  const back = wrapper.getByRole('button', { name: 'Back' });
  await expect(back).toBeVisible();
  await expect(back).not.toHaveAttribute('href');
  await expect(back).toHaveCSS('padding-left', '14px');
  await back.focus();
  await back.press('Enter');
  await expect(page.getByTestId('back-count')).toHaveText('1');

  const action = wrapper.getByRole('button', { name: 'Refresh' });
  await expect(action).toHaveClass(/custom-action/);
  await action.press('Space');
  await expect(page.getByTestId('action-count')).toHaveText('1');
});

test('HMCTS main wrapper forwards summary errors and warning mode, and omits unset content accessibly', async ({ page }) => {
  await page.goto('/hmcts-main-wrapper');
  const wrapper = page.locator('xuilib-hmcts-main-wrapper');

  await page.getByRole('button', { name: 'Show errors' }).click();
  await expect(wrapper.getByRole('alert')).toContainText('Check your answers');
  await page.getByRole('button', { name: 'Show warning' }).click();
  await expect(wrapper.getByRole('alert')).toContainText('Check your answers');
  await expect(wrapper.locator('.govuk-error-summary')).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear optional content' }).click();
  await expect(wrapper.getByRole('heading', { level: 1 })).toHaveCount(0);
  await expect(wrapper.getByRole('button', { name: 'Back' })).toBeVisible();
  await expect(wrapper.getByRole('link', { name: 'Back' })).toHaveCount(0);
  await expect(wrapper.locator('.hmcts-banner')).toHaveCount(0);
  await expect(wrapper.getByRole('button', { name: 'Refresh' })).toHaveCount(0);
  await expect(wrapper.getByText('Projected wrapper content')).toBeVisible();

  const result = await new AxeBuilder({ page }).include('core-hmcts-main-wrapper-host').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
