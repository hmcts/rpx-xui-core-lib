import { expect, test } from '@playwright/test';

test('session dialog displays projected content and preserves close output', async ({ page }) => {
  await page.goto('/session-dialog');
  await page.getByRole('button', { name: 'Open session dialog' }).click();
  const dialog = page.locator('xuilib-session-dialog dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'We are about to sign you out' })).toBeVisible();
  await expect(dialog).toHaveCSS('margin-top', '30px');
  await expect(dialog.getByText('For your security, sign out in 30 seconds.')).toBeVisible();
  await page.getByRole('button', { name: 'Invoke close' }).click();
  await expect(page.getByText('Close events: 1')).toBeVisible();
  await dialog.getByRole('button', { name: 'Stay signed in' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open session dialog' })).toBeFocused();
});

test('session dialog translates the sign-out message', async ({ page }) => {
  await page.goto('/session-dialog');
  await page.getByRole('button', { name: 'Open session dialog' }).click();
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(page.locator('xuilib-session-dialog')).toContainText('Rydym ar fin eich allgofnodi');
  await expect(page.getByRole('dialog', { name: 'Rydym ar fin eich allgofnodi' })).toBeVisible();
});

test('session dialog passes serious accessibility checks', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('/session-dialog');
  await page.getByRole('button', { name: 'Open session dialog' }).click();
  const result = await new AxeBuilder({ page }).include('xuilib-session-dialog').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});


test('session dialog is modal and keeps keyboard focus away from background', async ({ page }) => {
  await page.goto('/session-dialog');
  const opener = page.getByRole('button', { name: 'Open session dialog' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'We are about to sign you out' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
  expect(await dialog.evaluate(element => element.contains(document.activeElement) || element === document.activeElement)).toBe(true);
  const background = page.getByRole('button', { name: 'Background action' });
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    await expect(opener).not.toBeFocused();
    await expect(background).not.toBeFocused();
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab');
    await expect(opener).not.toBeFocused();
    await expect(background).not.toBeFocused();
  }
  await opener.evaluate(element => element.focus());
  await expect(opener).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(page.getByText('Close events: 0')).toBeVisible();
  await dialog.getByRole('button', { name: 'Stay signed in' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'We are about to sign you out' })).toBeVisible();
});


test('destroying the dialog after its opener is removed does not restore focus to a detached node', async ({ page }) => {
  await page.goto('/session-dialog');
  await page.getByRole('button', { name: 'Open session dialog' }).click();
  await page.getByRole('button', { name: 'Remove opener and close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open session dialog' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Background action' }).click();
  await expect(page.getByText('Background clicks: 1')).toBeVisible();
});

test('nested modal restoration returns focus to its own opener', async ({ page }) => {
  await page.goto('/session-dialog');
  await page.getByRole('button', { name: 'Open session dialog' }).click();
  const first = page.getByRole('dialog').first();
  const openSecond = first.getByRole('button', { name: 'Open second dialog' });
  await openSecond.click();
  const second = page.getByRole('dialog').last();
  expect(await second.evaluate(element => element.matches(':modal'))).toBe(true);
  await second.getByRole('button', { name: 'Close second dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(openSecond).toBeFocused();
});
