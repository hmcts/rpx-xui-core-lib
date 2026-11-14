import { test, expect } from '@playwright/test';

test('invitation emits submit and displays parent validation', async ({ page }) => {
  await page.goto('/invitation');
  await page.getByRole('button', {name:'Send invitation'}).click();
  await expect(page.getByText('Enter a first name')).toBeVisible();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
});

test('invitation emits entered details and selected permissions', async ({ page }) => {
  await page.goto('/invitation');
  await page.getByLabel('First name').fill('Synthetic');
  await page.getByLabel('Last name').fill('User');
  await page.getByLabel('Email address').fill('user@example.invalid');
  await page.getByLabel('Manage Users').check();
  await page.getByRole('button', {name:'Send invitation'}).click();
  const data = JSON.parse(await page.getByTestId('submitted').innerText());
  expect(data.email).toBe('user@example.invalid');
  expect(data.roles['pui-user-manager']).toBe(true);
  expect(data.roles['pui-case-manager']).toBe(false);
});

test('invitation form supports keyboard selection and passes axe', async ({ page }) => {
  await page.goto('/invitation');
  const checkbox = page.getByLabel('Manage Users');
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('xuilib-invite-user-form').analyze();
  expect(result.violations).toEqual([]);
});

test('invalid invitation inputs expose their errors accessibly', async ({ page }) => {
  await page.goto('/invitation');
  await page.getByRole('button', {name:'Send invitation'}).click();
  const firstName = page.getByLabel('First name');
  await expect(firstName).toHaveAccessibleDescription(/Enter a first name/);
  await expect(firstName).toHaveAttribute('aria-invalid', 'true');
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const result = await new AxeBuilder({ page }).include('xuilib-invite-user-form').analyze();
  expect(result.violations).toEqual([]);
});


test('invitation retains and updates a preselected permission', async ({ page }) => {
  await page.goto('/invitation?preselected=1');
  const checkbox = page.getByLabel('Manage Users');
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await page.getByRole('button', {name:'Send invitation'}).click();
  const data = JSON.parse(await page.getByTestId('submitted').innerText());
  expect(data.roles['pui-user-manager']).toBe(false);
});


test('permission error is announced by the permissions fieldset', async ({ page }) => {
  await page.goto('/invitation');
  await page.getByRole('button', {name:'Send invitation'}).click();
  const group = page.getByRole('group', {name:'Permissions'});
  await expect(group).toHaveAccessibleDescription(/Choose at least one permission/);
});


test('permissions with an empty error never reference a missing message', async ({ page }) => {
  await page.goto('/invitation?emptyRoleError=1');
  await page.getByRole('button', {name:'Send invitation'}).click();
  const group = page.getByRole('group', {name:'Permissions'});
  const ids = (await group.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  for (const id of ids) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  await expect(group).toHaveAccessibleDescription('Choose what the user will be able to do. You can change this later.');
});
