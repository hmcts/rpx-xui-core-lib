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

test('indents and outdents a numbered-list item with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.getByRole('button', { name: 'Numbered List', exact: true }).click();
  await page.keyboard.type('Parent item');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Nested item');
  await page.keyboard.press('Tab');

  await expect(editor.locator('ol > li > ol > li')).toContainText('Nested item');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('<ol type="a">');

  await page.keyboard.press('Shift+Tab');
  await expect(editor.locator('ol > li').nth(1)).toContainText('Nested item');
  await expect(editor.locator('ol > li > ol')).toHaveCount(0);
});

test('sanitises pasted rich text before storing it in the form', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.evaluate(() => {
    const target = document.querySelector('[contenteditable="true"]');
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', '<p onclick="window.__pasteExecuted=true">Safe text</p><script>window.__pasteExecuted=true</script><img src="x" onerror="window.__pasteExecuted=true"><a href="javascript:window.__pasteExecuted=true">unsafe link</a>');
    target.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
  });

  await expect(editor).toContainText('Safe text');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('Safe text');
  const storedValue = await page.evaluate(() => globalThis.readRichTextValue());
  expect(storedValue).not.toMatch(/<script|<img|onclick|javascript:/i);
  expect(await page.evaluate(() => globalThis.__pasteExecuted || false)).toBe(false);
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

test('keeps a new case flag selectable when no persisted detail exists', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseFlagHost());

  const option = page.getByRole('radio', { name: 'Fictional party - New safety concern' });
  await expect(option).toBeVisible();
  await option.check();
  await expect(option).toBeChecked();
  expect(await page.evaluate(() => globalThis.readCaseFlagSelection())).toEqual({ id: 'new-flag', originalStatus: null });

  await page.getByRole('button', { name: 'Continue' }).click();
  expect(await page.evaluate(() => globalThis.readCaseFlagState())).toEqual({ selectedFlagId: 'new-flag', originalStatus: null, errorMessages: [] });
  expect(errors).toEqual([]);
});

test('preserves the persisted status when selecting an existing case flag', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseFlagHost('Active'));

  const option = page.getByRole('radio', { name: 'Fictional party - New safety concern' });
  await expect(option).toBeVisible();
  await option.check();
  expect(await page.evaluate(() => globalThis.readCaseFlagSelection())).toEqual({ id: 'new-flag', originalStatus: 'Active' });

  await page.getByRole('button', { name: 'Continue' }).click();
  expect(await page.evaluate(() => globalThis.readCaseFlagState())).toEqual({ selectedFlagId: 'new-flag', originalStatus: 'Active', errorMessages: [] });
  expect(errors).toEqual([]);
});

test('shows a selection error when proceeding without choosing a case flag', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseFlagHost());

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#manage-case-flag-not-selected-error-message')).toContainText('Please make a selection');
  expect(await page.evaluate(() => globalThis.readCaseFlagSelection())).toBeNull();
  expect(await page.evaluate(() => globalThis.readCaseFlagState().errorMessages)).toEqual(['Please make a selection']);
});

test('renders the full case viewer for resolved standard-access case data', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseViewerHost('STANDARD', 'FULL'));
  await expect(page.locator('ccd-case-full-access-view')).toBeVisible();
  await expect(page.getByTestId('restricted-view')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('renders the migrated full-access case tab and field', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseViewerFullAccessHost());

  const tab = page.getByRole('tab', { name: 'Overview' });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page.getByText('Fictional summary')).toBeVisible();
  expect(errors).toEqual([]);
});

test('renders the restricted case viewer for challenged access', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseViewerHost('CHALLENGED', 'BASIC'));
  const restrictedView = page.locator('ccd-case-basic-access-view');
  await expect(restrictedView).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Case details' })).toBeVisible();
  await expect(page.getByText(/This case requires challenged access/)).toBeVisible();
  const requestAccess = page.getByRole('button', { name: 'Request access' });
  await expect(requestAccess).toBeVisible();
  await expect(requestAccess).toBeEnabled();
  expect(await page.evaluate(() => globalThis.readCaseViewerRequestUrl())).toBe('challenged-access-request');
  await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '#');
  await expect(page.getByTestId('full-view')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('renders case details from the notifier when resolved route data is absent', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseViewerNotifierHost());
  await expect(page.getByTestId('full-view')).toHaveCount(0);
  await expect(page.getByTestId('restricted-view')).toHaveCount(0);

  await page.evaluate(() => globalThis.emitCaseViewerDetails('STANDARD', 'FULL'));
  await expect(page.locator('ccd-case-full-access-view')).toBeVisible();
  await expect(page.getByTestId('restricted-view')).toHaveCount(0);
  expect(errors).toEqual([]);
});
