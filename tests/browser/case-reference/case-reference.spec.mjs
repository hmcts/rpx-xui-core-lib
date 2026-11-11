import { expect, test } from '@playwright/test';

test('case reference formatting preserves links and handles drafts', async ({ page }) => {
  await page.goto('/case-reference');
  const input = page.getByRole('textbox', { name: 'Case reference' });
  const output = page.getByTestId('formatted-reference');
  await expect(output).toHaveText('');
  await input.fill('1234567890123456');
  await expect(output).toHaveText('1234-5678-9012-3456');
  await input.fill('DRAFT123456789');
  await expect(output).toHaveText('DRAFT');
  await input.fill('Label [1234567890123456](/cases/1234567890123456) and 1111222233334444');
  await expect(output).toHaveText('Label [1234-5678-9012-3456](/cases/1234567890123456) and 1111-2222-3333-4444');
  await input.clear();
  await expect(output).toHaveText('');
});
