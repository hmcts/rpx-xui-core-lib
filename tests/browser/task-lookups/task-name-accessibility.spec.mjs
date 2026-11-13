import { expect, test } from '@playwright/test';

test('task-name exposes its hint as an accessible description', async ({ page }) => {
  await page.goto('/task-lookups');
  const input = page.locator('#inputSelectTaskName');
  await expect(input).toHaveAccessibleName('select a task name');
  await expect(input).toHaveAccessibleDescription('Type the name of the task name and select them.');
});

test('task-name descriptions follow rendered group errors and hints', async ({ page }) => {
  await page.goto('/task-lookups?taskA11y');
  const input = page.locator('#inputSelectTaskName');
  await expect(input).toHaveAttribute('aria-describedby', 'sub-title-hint');
  await page.getByRole('button', { name: 'Show task error' }).click();
  await expect(input).toHaveAttribute('aria-describedby', 'sub-title-hint validation-error');
  await expect(input).toHaveAccessibleDescription(/Select a valid task name/);
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Hide task hint' }).click();
  await expect(input).toHaveAttribute('aria-describedby', 'validation-error');
  await page.getByRole('button', { name: 'Clear task error' }).click();
  await expect(input).not.toHaveAttribute('aria-describedby', /.+/);
});

test('task-name exposes the existing submitted control invalid state', async ({ page }) => {
  await page.goto('/task-lookups?taskA11y');
  const input = page.locator('#inputSelectTaskName');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Require task name' }).click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.fill('task');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
});

test('task-name accessible name follows the selected language', async ({ page }) => {
  await page.route('**/translations/cy', route => {
    const phrases = route.request().postDataJSON().phrases;
    return route.fulfill({ json: { translations: Object.fromEntries(phrases.map(phrase =>
      [phrase, phrase === 'select a task name' ? 'Dewis tasg (synthetic)' : phrase])) } });
  });
  await page.goto('/task-lookups?taskA11y');
  const input = page.locator('#inputSelectTaskName');
  await expect(input).toHaveAccessibleName('select a task name');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(input).toHaveAccessibleName('Dewis tasg (synthetic)');
});
