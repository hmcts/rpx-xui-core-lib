import { test, expect } from '@playwright/test';

test('loads the editor browser host without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Editor browser host');
  expect(errors).toEqual([]);
});

test('opens the datetime calendar with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createDatetimeToggleHost());
  const button = page.locator('ngx-mat-datepicker-toggle button');
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('ngx-mat-calendar')).toBeVisible();
  await page.evaluate(() => globalThis.refreshDatetimeToggleHost());
  await expect(page.locator('ngx-mat-calendar .mat-calendar-body-cell').first()).toBeVisible();
  await page.locator('ngx-mat-calendar .mat-calendar-body-active').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('ngx-mat-calendar')).toHaveCount(0);
});

test('selects a date from the datetime calendar', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createDatetimeToggleHost());
  const input = page.locator('input.mat-datepicker-input');
  await expect(input).toHaveValue('');
  await page.locator('ngx-mat-datepicker-toggle button').click();
  await page.evaluate(() => globalThis.refreshDatetimeToggleHost());
  const day = page.locator('ngx-mat-calendar .mat-calendar-body-active');
  await expect(day).toBeVisible();
  await day.click();
  await page.evaluate(() => globalThis.refreshDatetimeToggleHost());
  await expect(input).not.toHaveValue('');
});

test('edits rich text and serialises a numbered list', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.keyboard.type('First item');
  await expect(editor).toContainText('First item');
  await page.getByRole('button', { name: 'Numbered List', exact: true }).click();
  await expect(editor.locator('ol')).toContainText('First item');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('<ol');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('First item');
  expect(errors).toEqual([]);
});

test('closes each editor dialog using Enter and Space', async ({ page }) => {
  for (let index = 0; index < 4; index++) {
    for (const key of ['Enter', 'Space']) {
      await page.goto('/');
      await page.evaluate(index => globalThis.createDialogCloseHost(index), index);
      const close = page.getByRole('button', { name: 'Close', exact: true });
      expect(await close.evaluate(element => element.tabIndex)).toBe(0);
      await close.focus();
      await expect(close).toBeFocused();
      await page.keyboard.press(key);
      await expect.poll(() => page.evaluate(() => document.body.dataset.dialogResult)).toBe('Cancel');
    }
  }
});
