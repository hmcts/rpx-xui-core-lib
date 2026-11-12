import {test, expect} from '@playwright/test';
test('GOV.UK input connects its label and hint and updates the reactive form', async ({page}) => {
  await page.goto('/gov-input');
  const input=page.getByRole('textbox',{name:'Synthetic name'});
  await expect(input).toHaveAttribute('aria-describedby','synthetic-name-hint');
  await input.fill('synthetic value');
  await expect(page.getByTestId('form-value')).toHaveText('synthetic value');
});
test('GOV.UK input associates an error and restores hint-only state', async ({page}) => {
  await page.goto('/gov-input');
  const input=page.getByRole('textbox',{name:'Synthetic name'});
  await page.getByRole('button',{name:'Show error'}).click();
  await expect(input).toHaveAttribute('aria-invalid','true');
  await expect(input).toHaveAttribute('aria-describedby','synthetic-name-hint synthetic-name-error');
  await expect(page.locator('#synthetic-name-error')).toContainText('Synthetic error');
  await page.getByRole('button',{name:'Clear error'}).click();
  await expect(input).toHaveAttribute('aria-describedby','synthetic-name-hint');
});

test('non-heading label follows Welsh language', async ({page}) => {
 await page.goto('/gov-input'); await page.getByRole('button',{name:'Cymraeg'}).click(); await expect(page.getByRole('textbox',{name:'Enw synthetig'})).toBeVisible();
});
test('two errors have one unique described-by target', async ({page}) => {
 await page.goto('/gov-input'); await page.getByRole('button',{name:'Show two errors'}).click(); await expect(page.locator('#synthetic-name-error')).toHaveCount(1);
});
test('both validation messages contribute to the accessible description', async ({page}) => {
 await page.goto('/gov-input'); await page.getByRole('button',{name:'Show two errors'}).click();
 const input=page.getByRole('textbox',{name:'Synthetic name'});
 await expect(input).toHaveAccessibleDescription(/Synthetic hint.*Synthetic error.*Second error/);
});

test('invalid input without messages does not reference a missing error', async ({page}) => {
 await page.goto('/gov-input'); await page.getByRole('button',{name:'Show empty error'}).click();
 const input=page.getByRole('textbox',{name:'Synthetic name'});
 await expect(input).toHaveAttribute('aria-invalid','true');
 await expect(input).toHaveAttribute('aria-describedby','synthetic-name-hint');
 await expect(page.locator('#synthetic-name-error')).toHaveCount(0);
});

test('invalid input with no hint or messages has no description target', async ({page}) => {
 await page.goto('/gov-input'); await page.getByRole('button',{name:'Hide hint'}).click();
 await page.getByRole('button',{name:'Show empty error'}).click();
 const input=page.getByRole('textbox',{name:'Synthetic name'});
 await expect(input).toHaveAttribute('aria-invalid','true');
 await expect(input).not.toHaveAttribute('aria-describedby');
});
