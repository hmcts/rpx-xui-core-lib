import { test, expect } from '@playwright/test';

test('remaining GOV.UK controls update their reactive form values through real browser input', async ({ page }) => {
  await page.goto('/gov-controls');
  await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Synthetic notes');
  await expect(page.getByTestId('notes-value')).toHaveText('Synthetic notes');
  await page.getByRole('checkbox', { name: 'First choice' }).check();
  await page.getByRole('checkbox', { name: 'Second choice' }).check();
  await expect(page.getByTestId('choices-value')).toHaveText('first,second');
  await page.getByRole('checkbox', { name: 'First choice' }).uncheck();
  await expect(page.getByTestId('choices-value')).toHaveText('second');
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('radio', { name: 'No', exact: true }).check();
  await expect(page.getByTestId('radio-value')).toHaveText('no');
  await page.getByRole('radio', { name: 'No', exact: true }).press('ArrowLeft');
  await expect(page.getByTestId('radio-value')).toHaveText('yes');
  await page.getByLabel('Document', { exact: true }).setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic document') });
  await expect(page.getByTestId('file-value')).toContainText('synthetic.txt');
});

test('textarea instances have unique existing hint and error targets', async ({ page }) => {
  await page.goto('/gov-controls');
  for (const [name, id] of [['Notes', 'notes'], ['Other notes', 'other']]) {
    const control = page.getByRole('textbox', { name, exact: true });
    await expect(control).toHaveAttribute('aria-describedby', `${id}-hint`);
    await expect(page.locator(`[id="${id}-hint"]`)).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Show errors' }).click();
  await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveAttribute('aria-describedby', 'notes-hint notes-error');
  await expect(page.locator('#notes-error')).toContainText('Required');
});


test('migrated controls expose errors and remove missing error descriptions when messages clear', async ({ page }) => {
  await page.goto('/gov-controls');
  const controls = [page.getByRole('textbox', { name: 'Notes', exact: true }), page.getByLabel('Document', { exact: true }), page.getByRole('checkbox', { name: 'First choice' })];
  await page.getByRole('button', { name: 'Show errors', exact: true }).click();
  for (const control of controls) {
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAccessibleDescription(/Required/);
  }
  await page.getByRole('button', { name: 'Empty errors', exact: true }).click();
  for (const control of controls) {
    const references = (await control.getAttribute('aria-describedby')).split(/\s+/);
    for (const id of references) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Clear errors', exact: true }).click();
  for (const control of controls) await expect(control).not.toHaveAttribute('aria-invalid', 'true');
});

test('migrated controls support form reset and have no automated accessibility violations', async ({ page }) => {
  await page.goto('/gov-controls');
  await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Before reset');
  await page.getByRole('checkbox', { name: 'First choice' }).check();
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('button', { name: 'Reset form', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: 'First choice' })).not.toBeChecked();
  await expect(page.getByRole('radio', { name: 'Yes', exact: true })).not.toBeChecked();
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});
