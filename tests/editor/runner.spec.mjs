import { test, expect } from '@playwright/test';

test('loads the editor browser host without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Editor browser host');
  expect(errors).toEqual([]);
});

test('error-summary navigation keeps the editor route and unsaved form values', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createErrorSummaryHost());
  const title = page.getByLabel('Case title');
  await title.fill('Unsaved case detail');
  // BrowserTestingModule uses MockLocationStrategy; sync the native URL for base-href resolution.
  await page.evaluate(() => history.replaceState({}, '', '/cases/123/edit'));
  const documentTimeOrigin = await page.evaluate(() => performance.timeOrigin);
  const errorLink = page.getByRole('link', { name: 'Enter a case title' });

  await errorLink.click();

  await expect(page).toHaveURL(/\/cases\/123\/edit$/);
  await expect(errorLink).toHaveAttribute('href', '/cases/123/edit#case-title');
  await expect(title).toHaveValue('Unsaved case detail');
  await expect.poll(() => page.evaluate(() => globalThis.readErrorSummaryRouterUrl())).toBe('/cases/123/edit#case-title');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentTimeOrigin);
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

test('mid-event callback HTML does not execute or persist active markup', async ({ page }) => {
  const blockedExternalRequests = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      return route.continue();
    }
    blockedExternalRequests.push(url.href);
    return route.abort();
  });
  await page.addInitScript(() => { Reflect.set(window, '__xssMarker', 0); });
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost(true, '<p>Initial safe text</p><img src="https://xui-rich-text.invalid/initial" onerror="window.__xssMarker=3">'));

  const editor = page.getByRole('textbox', { name: 'Notes' });
  await expect(editor).toContainText('Initial safe text');
  await expect(editor.locator('a, img, svg')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('Initial safe text');
  expect(await page.evaluate(() => globalThis.readRichTextValue())).not.toMatch(/<img|onerror|javascript:/i);
  expect(await page.evaluate(() => Reflect.get(globalThis, '__xssMarker'))).toBe(0);
  await page.evaluate(() => globalThis.setRichTextValue(
    '<p>Safe callback text</p><a href="javascript:window.__xssMarker=1">Safe link label</a><img src="https://xui-rich-text.invalid/pixel" onerror="window.__xssMarker=2">'
  ));

  await expect(editor).toContainText('Safe callback text');
  await expect(editor).toContainText('Safe link label');
  await expect(editor.locator('a, img, svg')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('Safe callback text');
  expect(await page.evaluate(() => Reflect.get(globalThis, '__xssMarker'))).toBe(0);
  expect(blockedExternalRequests).toEqual([]);

  await editor.click();
  await page.keyboard.type(' remains editable');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('remains editable');
});

test('does not stack the rich-text sanitizer when a parent control is reused', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost(true, '', true));
  const firstSetValueId = await page.evaluate(() => globalThis.readRichTextSetValueId());

  await page.evaluate(() => globalThis.createRichTextHost(true, '', true));

  expect(await page.evaluate(() => globalThis.readRichTextSetValueId())).toBe(firstSetValueId);
});

test('preserves legal citations when entered as ordinary text', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.keyboard.type('[12](b) [2023][EWCA]');

  await expect(editor).toHaveText('[12](b) [2023][EWCA]');
  await expect.poll(() => page.evaluate(() => globalThis.readRichTextValue())).toContain('[12](b) [2023][EWCA]');
});

test('does not apply Word date-range spacing to text typed into the editor', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.keyboard.type('1990-2020');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await page.keyboard.type('Citation');

  await expect(editor).toHaveText('1990-2020Citation');
  const storedValue = await page.evaluate(() => globalThis.readRichTextValue());
  expect(storedValue).toContain('1990-2020');
  expect(storedValue).not.toContain('&nbsp;');
  await expect.poll(() => page.evaluate(() => {
    const editorElement = document.querySelector('.ProseMirror');
    const selection = window.getSelection();
    if (!editorElement || !selection?.anchorNode || !editorElement.contains(selection.anchorNode)) return '';
    const range = document.createRange();
    range.selectNodeContents(editorElement);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return range.toString();
  })).toBe('1990-2020Citation');
});

test('keeps the caret before formatted text when a typed date range becomes complete', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.keyboard.type('1990-20');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await page.keyboard.type('Citation');
  await editor.evaluate(element => {
    const text = element.querySelector('p').firstChild;
    const range = document.createRange();
    range.setStart(text, text.textContent.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.type('20X');

  await expect(editor).toHaveText('1990-2020XCitation');
});

test('keeps Word date-range spacing when the formatted content is pasted', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createRichTextHost());
  const editor = page.getByRole('textbox', { name: 'Notes' });
  await editor.click();
  await page.evaluate(() => {
    const target = document.querySelector('[contenteditable="true"]');
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', '<p>1990-2020<strong>Citation</strong></p>');
    target.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
  });

  await expect(editor).toHaveText(`1990-2020${'\u00a0'.repeat(12)}Citation`);
  const storedValue = await page.evaluate(() => globalThis.readRichTextValue());
  expect(storedValue.match(/&nbsp;/g)).toHaveLength(12);
  expect(storedValue).toContain('<b>Citation</b>');
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
  await expect(page.locator('ccd-case-basic-access-view')).toHaveCount(0);
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
  await expect(page.locator('ccd-case-full-access-view')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('renders case details from the notifier when resolved route data is absent', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.createCaseViewerNotifierHost());
  await expect(page.locator('ccd-case-full-access-view')).toHaveCount(0);
  await expect(page.locator('ccd-case-basic-access-view')).toHaveCount(0);

  await page.evaluate(() => globalThis.emitCaseViewerDetails('STANDARD', 'FULL'));
  await expect(page.locator('ccd-case-full-access-view')).toBeVisible();
  await expect(page.locator('ccd-case-basic-access-view')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('rejects an unsupported document in the browser without uploading it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createDocumentUploadHost());

  const fileInput = page.locator('input[type="file"]');
  await expect(page.getByRole('button', { name: 'Supporting document' })).toBeVisible();
  await fileInput.setInputFiles({
    name: 'notice.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a PDF')
  });

  await expect(page.getByRole('alert')).toHaveText('Document format is not supported');
  const state = await page.evaluate(() => globalThis.readDocumentUploadState());
  expect(state.uploadCount).toBe(0);
  expect(state.uploadInProgress).toBe(false);
  expect(state.formErrors).toEqual({ invalidFileFormat: true });
  expect(state.documentValue).toMatchObject({ document_url: null, document_binary_url: null, document_filename: null });
});

test('uploads an accepted document and writes its links into the case field', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createDocumentUploadHost());

  const fileInput = page.locator('input[type="file"]');
  await expect(page.getByRole('button', { name: 'Supporting document' })).toBeVisible();
  await fileInput.setInputFiles({
    name: 'notice.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 local test document')
  });

  const state = await page.evaluate(() => globalThis.readDocumentUploadState());
  expect(state.uploadCount).toBe(1);
  expect(state.uploadInProgress).toBe(false);
  expect(state.documentValue).toEqual({
    document_url: '/documents/1',
    document_binary_url: '/documents/1/binary',
    document_filename: 'notice.pdf'
  });
  expect(state.caseFieldValue).toMatchObject({
    document_url: '/documents/1',
    document_binary_url: '/documents/1/binary',
    document_filename: 'notice.pdf'
  });
  expect(state.uploadPayload).toMatchObject({
    fileName: 'notice.pdf',
    classification: 'PUBLIC',
    caseTypeId: 'civil',
    jurisdictionId: 'family'
  });
  await expect(page.getByRole('alert')).toBeHidden();
});

test('keeps the replacement document when uploads complete out of order', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createDocumentUploadHost(true));

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({ name: 'first.pdf', mimeType: 'application/pdf', buffer: Buffer.from('first') });
  await fileInput.setInputFiles({ name: 'replacement.pdf', mimeType: 'application/pdf', buffer: Buffer.from('replacement') });

  expect(await page.evaluate(() => globalThis.readDocumentUploadState().activeUploadObservers)).toEqual([false, true]);
  await page.evaluate(() => globalThis.resolveDocumentUpload(1, '/documents/replacement', 'replacement.pdf'));
  await page.evaluate(() => globalThis.resolveDocumentUpload(0, '/documents/first', 'first.pdf'));

  const state = await page.evaluate(() => globalThis.readDocumentUploadState());
  expect(state.documentValue).toEqual({
    document_url: '/documents/replacement',
    document_binary_url: '/documents/replacement/binary',
    document_filename: 'replacement.pdf'
  });
  expect(state.caseFieldValue.document_url).toBe('/documents/replacement');
  expect(state.uploadInProgress).toBe(false);
});

test('does not apply a late upload after the selected replacement is rejected', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createDocumentUploadHost(true));

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({ name: 'first.pdf', mimeType: 'application/pdf', buffer: Buffer.from('first') });
  await fileInput.setInputFiles({ name: 'rejected.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('rejected') });
  await page.evaluate(() => globalThis.resolveDocumentUpload(0, '/documents/first', 'first.pdf'));

  const state = await page.evaluate(() => globalThis.readDocumentUploadState());
  expect(state.activeUploadObservers).toEqual([false]);
  expect(state.uploadInProgress).toBe(false);
  expect(state.formErrors).toEqual({ invalidFileFormat: true });
  expect(state.documentValue).toMatchObject({ document_url: null, document_binary_url: null, document_filename: null });
  await expect(page.getByRole('alert')).toHaveText('Document format is not supported');
});

test('linked-case browser reports an outgoing lookup failure without failing the incoming table', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createLinkedCasesHost('to'));

  const state = await page.evaluate(() => globalThis.readLinkedCasesState());
  expect(state.toFailure).toBe(true);
  expect(state.fromFailure).toBe(false);
  expect(state.retryLinks).toEqual(['Reload the Linked cases tab']);
  expect(state.fromRows).toContain('None');
});

test('linked-case browser reports an incoming lookup failure without failing the outgoing table', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createLinkedCasesHost('from'));

  const state = await page.evaluate(() => globalThis.readLinkedCasesState());
  expect(state.toFailure).toBe(false);
  expect(state.fromFailure).toBe(true);
  expect(state.retryLinks).toEqual(['Reload the Linked cases tab']);
  expect(state.toRows).toContain('Linked case');
});

test('linked-case browser shows the combined failure and retries the linked-cases route', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createLinkedCasesHost('both'));

  const state = await page.evaluate(() => globalThis.readLinkedCasesState());
  expect(state.combinedFailures).toBe(2);
  expect(state.retryLinks).toEqual(['Reload the Linked cases tab', 'Reload the Linked cases tab']);

  await page.getByRole('link', { name: 'Reload the Linked cases tab' }).first().click();
  expect(await page.evaluate(() => globalThis.readLinkedCasesState())).toMatchObject({
    navigation: [[['cases', 'case-details', 'family', 'civil', 'CASE-123'], { fragment: 'Linked cases' }]]
  });
});

test('linked-case before-you-start error returns to the case links tab', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createLinkedCasesBackHost('before-you-start'));

  await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
  await page.getByRole('button', { name: 'Go back to the Linked cases tab' }).click();
  expect(await page.evaluate(() => globalThis.readLinkedCasesBackNavigation())).toEqual([
    [['cases', 'case-details', 'family', 'civil', 'CASE-123'], { fragment: 'Linked cases' }]
  ]);
});

test('linked-case empty state returns to the case links tab', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => globalThis.createLinkedCasesBackHost('no-linked-cases'));

  await expect(page.getByText('Linked cases are unavailable')).toBeVisible();
  await page.getByRole('button', { name: 'Go back to the Linked cases tab' }).click();
  expect(await page.evaluate(() => globalThis.readLinkedCasesBackNavigation())).toEqual([
    [['cases', 'case-details', 'family', 'civil', 'CASE-123'], { fragment: 'Linked cases' }]
  ]);
});


test('writes a new case flag through the real wizard while preserving persisted details', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.mountFlagWriterHost());
  const host = page.locator('#flag-writer-journey');
  const evidence = async () => JSON.parse(await host.locator('#flag-writer-evidence').textContent());
  await host.getByRole('radio', { name: 'Fictional party' }).check();
  await host.getByRole('button', { name: 'Continue flag journey' }).click();
  await host.getByRole('radio', { name: 'New concern', exact: true }).check();
  await host.getByRole('button', { name: 'Continue flag journey' }).click();
  const selected = await evidence();
  expect(selected.details).toEqual([{ id: 'existing', value: { name: 'Existing concern', status: 'Active' } }]);
  expect(selected.formattedDetails).toEqual(selected.details);
  await host.locator('textarea').fill('Synthetic safety concern');
  await host.getByRole('button', { name: 'Continue flag journey' }).click();
  const reviewed = await evidence();
  expect(reviewed.reviewRequested).toBe(true);
  expect(reviewed.valid).toBe(true);
  expect(reviewed.details).toHaveLength(2);
  expect(reviewed.details[0]).toEqual(selected.details[0]);
  expect(reviewed.details[1].value).toMatchObject({ name: 'New concern', flagCode: 'NEW', status: 'Active' });
  await host.getByRole('button', { name: 'Submit flag', exact: true }).click();
  const first = (await evidence()).submission;
  expect(first.payloads).toHaveLength(1);
  expect(first.payloads[0].data.partyFlags.details).toEqual(reviewed.details);
  await host.getByRole('button', { name: 'Return callback failure' }).click();
  expect((await evidence()).submission.snapshotRetained).toBe(true);
  expect((await evidence()).submission.snapshotDetails).toEqual(selected.details);
  await host.getByRole('button', { name: 'Submit flag', exact: true }).click();
  const retry = (await evidence()).submission;
  expect(retry.payloads).toHaveLength(2);
  expect(retry.payloads[1]).toEqual(retry.payloads[0]);
  await host.getByRole('button', { name: 'Return callback success' }).click();
  expect((await evidence()).submission.snapshotRetained).toBe(false);
  expect((await evidence()).submission).not.toHaveProperty('snapshotDetails');
  expect((await evidence()).submission.caseCacheRemovals).toBe(1);
  expect(errors).toEqual([]);
});
