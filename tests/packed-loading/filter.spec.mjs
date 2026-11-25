import { expect, test } from '@playwright/test';

test('the installed Generic Filter Apply updates the directly injected FilterService stream', async ({ page }) => {
  const split = process.env.CORE_FILTER_SPLIT === '1';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(split ? '/?splitFilterService' : '/');
  const load = page.getByRole('button', { name: 'Load Generic Filter' });
  await expect(page.locator('xuilib-generic-filter')).toHaveCount(0);
  await load.click();
  const widget = page.locator('xuilib-generic-filter');
  const stream = page.getByTestId('filter-stream');
  await expect(page.getByTestId('filter-provider')).toHaveText(split ? 'split' : 'shared');
  await expect(page.getByTestId('filter-id')).toHaveText(/^packed-filter-[a-f0-9-]+$/);
  const id = await page.getByTestId('filter-id').innerText();
  await expect(stream).toHaveText('null');

  await widget.getByRole('textbox', { name: 'Subject' }).fill('Synthetic subject');
  await widget.getByRole('button', { name: 'Apply' }).click();
  const expected = { id, fields: [{ name: 'subject', value: ['Synthetic subject'] }], reset: false };
  const stored = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), id);
  expect(stored).toEqual(expected);
  expect(errors).toEqual([]);
  await expect.poll(async () => JSON.parse(await stream.innerText()), {
    message: 'Generic Filter Apply must notify the directly injected FilterService stream',
  }).toEqual(expected);
});
