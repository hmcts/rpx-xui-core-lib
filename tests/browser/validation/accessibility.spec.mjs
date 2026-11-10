import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Validation diagnostic pilot' })).toBeVisible();
});

test('validation keyboard traversal toggles roles and submits with Enter and Space', async ({ page }) => {
  const first = page.getByRole('checkbox', { name: 'First role', exact: true });
  const second = page.getByRole('checkbox', { name: 'Second role', exact: true });
  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  const validity = page.getByTestId('validity');
  const alert = page.getByRole('alert');

  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Space');
  await expect(first).toBeChecked();
  await expect(validity).toHaveText('Valid');
  await page.keyboard.press('Space');
  await expect(first).not.toBeChecked();
  await expect(validity).toHaveText('Invalid');
  await expect(alert).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(second).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(submit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(alert).toHaveText('Select at least one role');

  await page.keyboard.press('Shift+Tab');
  await expect(second).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Space');
  await expect(first).toBeChecked();
  await expect(validity).toHaveText('Valid');
  await expect(alert).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(second).toBeFocused();
  await page.keyboard.press('Space');
  await expect(second).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(submit).toBeFocused();
  await page.keyboard.press('Space');
  await expect(validity).toHaveText('Valid');
  await expect(alert).toHaveCount(0);

  await page.keyboard.press('Shift+Tab');
  await expect(second).toBeFocused();
  await page.keyboard.press('Space');
  await expect(second).not.toBeChecked();
  await expect(validity).toHaveText('Valid');
  await page.keyboard.press('Shift+Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Space');
  await expect(first).not.toBeChecked();
  await expect(validity).toHaveText('Invalid');
  await expect(alert).toHaveText('Select at least one role');

  await page.reload();
  await expect(validity).toHaveText('Invalid');
  await expect(alert).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(second).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(submit).toBeFocused();
  await page.keyboard.press('Space');
  await expect(alert).toHaveText('Select at least one role');
});

for (const state of ['initial', 'invalid-submit', 'valid']) {
  test(`validation ${state} exposes accessible roles and passes axe`, async ({ page }) => {
    const group = page.getByRole('group', { name: 'Select at least one role', exact: true });
    const first = group.getByRole('checkbox', { name: 'First role', exact: true });
    const second = group.getByRole('checkbox', { name: 'Second role', exact: true });
    const submit = page.getByRole('button', { name: 'Submit', exact: true });
    await expect(group).toBeVisible();
    await expect(first).not.toBeChecked();
    await expect(second).not.toBeChecked();
    await expect(submit).toBeVisible();

    if (state !== 'initial') await submit.click();
    if (state === 'valid') {
      await expect(page.getByRole('alert')).toHaveText('Select at least one role');
      await first.click();
      await expect(first).toBeChecked();
    }
    await expect(page.getByTestId('validity')).toHaveText(state === 'valid' ? 'Valid' : 'Invalid');
    if (state === 'invalid-submit') {
      await expect(page.getByRole('alert')).toMatchAriaSnapshot('- alert: Select at least one role');
      await expect(first).toHaveAttribute('aria-invalid', 'true');
      await expect(second).toHaveAttribute('aria-invalid', 'true');
      await expect(group).toHaveAccessibleDescription('Select at least one role');
    } else {
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(first).not.toHaveAttribute('aria-invalid');
      await expect(second).not.toHaveAttribute('aria-invalid');
      await expect(group).toHaveAccessibleDescription('');
    }

    const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(violations, `Axe violations (${state}): ${JSON.stringify(violations, null, 2)}`).toEqual([]);
  });
}

test('validation axe detects the label rule when a checkbox label is removed', async ({ page }, testInfo) => {
  await page.getByRole('checkbox', { name: 'First role', exact: true }).evaluate((checkbox) => {
    checkbox.parentElement.replaceWith(checkbox);
  });
  await expect(page.getByRole('checkbox', { name: '', exact: true })).toHaveCount(1);
  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
  await testInfo.attach('axe-label-fault', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations.map(({ id }) => id), JSON.stringify(violations, null, 2)).toContain('label');
  const labelViolation = violations.find(({ id }) => id === 'label');
  expect(labelViolation.nodes.map(({ target }) => target)).toContainEqual(['input[formcontrolname="first"]']);
});
