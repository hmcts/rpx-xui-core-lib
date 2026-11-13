import { expect, test } from '@playwright/test';

test('new input suppresses stale response and keyboard selection keeps latest person', async ({ page }) => {
  await page.goto('/find-person');
  const first = page.locator('#inputSelectPersonfirst');
  await expect(first).toHaveAccessibleName('select a person');
  await first.fill('alice');
  await expect.poll(() => page.evaluate(() => window.personHarness.count())).toBe(1);
  await first.fill('bob');
  await page.evaluate(() => window.personHarness.answer(0, [{ id:'old', name:'Alice', domain:'Admin' }]));
  await expect(page.getByRole('option', { name:'Alice' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.personHarness.count())).toBe(2);
  await page.evaluate(() => window.personHarness.answer(1, [{ id:'new', name:'Bob', domain:'Admin' }]));
  await expect(page.getByRole('option', { name:'Bob' })).toBeVisible();
  await first.press('ArrowDown');
  await first.press('Enter');
  await expect(page.getByTestId('selected')).toHaveText('Bob');
  await expect(first).toHaveValue('Bob');
  await page.evaluate(() => window.personHarness.answer(1, [{ id:'late', name:'Late', domain:'Admin' }]));
  // Wait past the component's 300ms debounce to check the selection remains stable.
  await page.waitForTimeout(400);
  await expect(page.getByTestId('selected')).toHaveText('Bob');
  await expect.poll(() => page.evaluate(() => window.personHarness.count())).toBe(2);
  await expect(page.getByRole('option', { name:'Late' })).toHaveCount(0);
});

test('multiple default lookup instances keep input and description ids unique', async ({ page }) => {
  await page.goto('/find-person');
  await expect(page.locator('#inputSelectPersonfirst')).toHaveAccessibleName('select a person');
  await expect(page.locator('#inputSelectPersonsecond')).toHaveAccessibleName('select a person');
  const ids = await page.locator('xuilib-find-person [id]').evaluateAll((elements) => elements.map(({ id }) => id));
  expect(new Set(ids).size).toBe(ids.length);
  await page.getByRole('button', { name: 'Show errors' }).click();
  const lookups = page.locator('xuilib-find-person');
  for (let index = 0; index < await lookups.count(); index++) {
    const lookup = lookups.nth(index);
    const input = lookup.locator('input');
    const describedBy = (await input.getAttribute('aria-describedby')).split(' ');
    for (const id of describedBy) {
      await expect(lookup.locator(`[id="${id}"]`)).toHaveCount(1);
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
    await expect(lookup.locator('fieldset')).toHaveAttribute('aria-describedby', describedBy.join(' '));
  }
});
