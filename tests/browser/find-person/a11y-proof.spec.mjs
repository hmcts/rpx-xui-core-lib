import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('one default and two explicitly identified instances expose only their own live descriptions', async ({ page }) => {
  await page.goto('/find-person?unique');
  const ids = ['', 'first', 'second'];
  for (const suffix of ids) {
    const input = page.locator(`[id="inputSelectPerson${suffix}"]`);
    await expect(input).toHaveCount(1);
    await expect(input).toHaveAccessibleName('select a person');
    await expect(input).toHaveAttribute('aria-describedby', `sub-title-hint${suffix}`);
    await expect(input).not.toHaveAttribute('aria-invalid');
    await expect(page.locator(`[id="sub-title-hint${suffix}"]`)).toHaveCount(1);
  }
  await page.getByRole('link', { name: 'Go to default person' }).click();
  await expect(page.locator('[id="inputSelectPerson"]')).toBeFocused();
  await page.getByRole('button', { name: 'Mark children invalid' }).click();
  await expect(page.locator('[id="inputSelectPersonfirst"]')).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('[id="inputSelectPerson"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[id^="validation-error"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show errors' }).click();
  for (const suffix of ids) {
    const input = page.locator(`[id="inputSelectPerson${suffix}"]`);
    await expect(page.locator(`[id="validation-error${suffix}"]`)).toHaveCount(1);
    await expect(input).toHaveAttribute('aria-describedby', `sub-title-hint${suffix} validation-error${suffix}`);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  }
  await page.getByRole('button', { name: 'Clear errors' }).click();
  for (const suffix of ids) {
    await expect(page.locator(`[id="validation-error${suffix}"]`)).toHaveCount(0);
    await expect(page.locator(`[id="inputSelectPerson${suffix}"]`)).toHaveAttribute('aria-describedby', `sub-title-hint${suffix}`);
  }
  await page.getByRole('button', { name: 'Hide hints' }).click();
  for (const suffix of ids) {
    await expect(page.locator(`[id="sub-title-hint${suffix}"]`)).toHaveCount(0);
    await expect(page.locator(`[id="inputSelectPerson${suffix}"]`)).not.toHaveAttribute('aria-describedby');
  }
  await page.getByRole('button', { name: 'Show errors' }).click();
  for (const suffix of ids) {
    await expect(page.locator(`[id="inputSelectPerson${suffix}"]`)).toHaveAttribute('aria-describedby', `validation-error${suffix}`);
    await expect(page.locator(`[id="inputSelectPerson${suffix}"]`)).toHaveAttribute('aria-invalid', 'true');
  }
});

test('visible group error marks the input invalid even when not submitted', async ({ page }) => {
  await page.goto('/find-person?unique');
  await page.getByRole('button', { name: 'Show errors' }).click();
  const input = page.locator('[id="inputSelectPersonfirst"]');
  await expect(page.locator('xuilib-find-person').first().locator('.govuk-error-message')).toBeVisible();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
});

test('a submitted child-only invalid state marks input invalid without fabricating an error', async ({ page }) => {
  await page.goto('/find-person?unique');
  await page.getByRole('button', { name: 'Mark children invalid' }).click();
  await expect(page.locator('[id="inputSelectPerson"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[id^="validation-error"]')).toHaveCount(0);
});


test('one default and two distinct idValue instances have no automated WCAG violations in error state', async ({ page }) => {
  await page.goto('/find-person?unique');
  await page.getByRole('button', { name: 'Show errors' }).click();
  const result = await new AxeBuilder({ page }).include('core-find-person-host').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});


test('changing idValue updates input and live description targets together', async ({ page }) => {
  await page.goto('/find-person?unique');
  await page.getByRole('button', { name: 'Show errors' }).click();
  await expect(page.locator('[id="inputSelectPersonfirst"]')).toHaveAttribute('aria-describedby', 'sub-title-hintfirst validation-errorfirst');
  await page.getByRole('button', { name: 'Change first ID' }).click();
  await expect(page.locator('[id="inputSelectPersonfirst"]')).toHaveCount(0);
  await expect(page.locator('[id="sub-title-hintfirst"]')).toHaveCount(0);
  await expect(page.locator('[id="validation-errorfirst"]')).toHaveCount(0);
  const input = page.locator('[id="inputSelectPersonrenamed"]');
  await expect(input).toHaveAttribute('aria-describedby', 'sub-title-hintrenamed validation-errorrenamed');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[id="sub-title-hintrenamed"]')).toHaveCount(1);
  await expect(page.locator('[id="validation-errorrenamed"]')).toHaveCount(1);
  await expect(page.locator('fieldset').filter({ has: input })).toHaveAttribute('aria-describedby', 'sub-title-hintrenamed validation-errorrenamed');
});
