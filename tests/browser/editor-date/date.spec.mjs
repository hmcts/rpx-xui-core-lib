import { expect, test } from '@playwright/test';

test('date input preserves validation and values across translations', async ({ page }) => {
  await page.route('**/translations/cy', async route => {
    const { phrases } = route.request().postDataJSON();
    const dictionary = { Day: 'Dydd', Month: 'Mis', Year: 'Blwyddyn' };
    await route.fulfill({ status: 200, json: { translations: Object.fromEntries(phrases.map(phrase => [phrase, dictionary[phrase] ?? phrase])) } });
  });
  await page.goto('/editor-date');
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByTestId('valid')).toHaveText('false');
  const day = page.getByRole('textbox', { name: 'Day' });
  const month = page.getByRole('textbox', { name: 'Month' });
  const year = page.getByRole('textbox', { name: 'Year' });
  await day.pressSequentially('29'); await month.pressSequentially('02');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  await expect(page.getByRole('textbox', { name: 'Dydd' })).toHaveValue('29');
  await expect(page.getByRole('textbox', { name: 'Mis' })).toHaveValue('02');
  await expect(page.getByRole('textbox', { name: 'Blwyddyn' })).toHaveValue('');
  await expect(page.getByTestId('valid')).toHaveText('false');
  await page.getByRole('button', { name: 'English' }).click();
  await year.pressSequentially('2024');
  await expect(page.getByTestId('valid')).toHaveText('true');
  await expect(page.getByTestId('value')).toHaveText('2024-02-29');
});

test('date input has accessible keyboard reachable date fields', async ({ page }) => {
  await page.goto('/editor-date');
  const day = page.getByRole('textbox', { name: 'Day' });
  const month = page.getByRole('textbox', { name: 'Month' });
  const year = page.getByRole('textbox', { name: 'Year' });
  await day.focus();
  await expect(day).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(month).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(year).toBeFocused();
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const results = await new AxeBuilder({ page }).include('core-editor-date-host').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});
