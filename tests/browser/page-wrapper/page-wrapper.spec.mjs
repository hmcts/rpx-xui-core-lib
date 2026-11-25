import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page wrapper renders its translated shell and projected content', async ({ page }) => {
  await page.goto('/page-wrapper');

  const wrapper = page.locator('exui-page-wrapper');
  await expect(wrapper.getByRole('heading', { level: 1, name: 'Case list' })).toBeVisible();
  await expect(wrapper.locator('.govuk-caption-xl')).toHaveText('Case management');
  await expect(wrapper.getByText('Projected page content')).toBeVisible();
  const backLink = wrapper.getByRole('link', { name: 'Back' });
  await expect(backLink).toHaveAttribute('href', '/cases');

  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(wrapper.getByRole('heading', { level: 1, name: 'Rhestr achosion' })).toBeVisible();
  await expect(wrapper.locator('.govuk-caption-xl')).toHaveText('Rheoli achosion');
  await expect(wrapper.getByRole('link', { name: 'Yn ôl' })).toHaveAttribute('href', '/cases');

  await wrapper.getByRole('link', { name: 'Yn ôl' }).click();
  await expect(page).toHaveURL(/\/cases$/);
});

test('page wrapper omits unset shell elements and passes a scoped accessibility scan', async ({ page }) => {
  await page.goto('/page-wrapper');
  await page.getByRole('button', { name: 'Remove optional shell content' }).click();

  const wrapper = page.locator('exui-page-wrapper');
  await expect(wrapper.getByRole('heading', { level: 1 })).toHaveCount(0);
  await expect(wrapper.getByRole('link', { name: 'Back' })).toHaveCount(0);
  await expect(wrapper.getByText('Projected page content')).toBeVisible();

  const result = await new AxeBuilder({ page }).include('core-page-wrapper-host').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
