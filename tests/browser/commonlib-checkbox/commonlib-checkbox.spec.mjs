import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/commonlib-checkbox');
});

test('single permission checkbox updates the reactive FormGroup like Manage Org expects', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: 'Manage cases for your organisation' });
  await expect(checkbox).not.toBeChecked();
  await expect(page.getByTestId('case-management-value')).toHaveText('false');

  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect(page.getByTestId('case-management-value')).toHaveText('true');
});

test('preselected role checkbox follows its FormGroup and preserves the configured focus target', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: 'Case access administrator' });
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toHaveAttribute('id', 'admin-access-control');
  await expect(page.locator('label[for="admin-access-control"]')).toBeVisible();
  await expect(checkbox).toHaveAttribute('name', 'roles');

  await checkbox.uncheck();
  await expect(page.getByTestId('admin-value')).toHaveText('false');
});

test('checkbox hints remain associated, translate and have no automated accessibility violations', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: 'Manage cases for your organisation' });
  await expect(checkbox).toHaveAttribute('aria-describedby', 'enableCaseManagement-item-hint');
  const hint = page.locator('#enableCaseManagement-item-hint');
  await expect(hint).toHaveText('This allows the user to submit and manage cases on behalf of your organisation');

  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(hint).toHaveText('Mae hyn yn galluogi’r defnyddiwr i gyflwyno a rheoli achosion ar ran eich sefydliad');
  const result = await new AxeBuilder({ page }).include('#core-commonlib-checkbox-host').analyze();
  expect(result.violations).toEqual([]);
});
