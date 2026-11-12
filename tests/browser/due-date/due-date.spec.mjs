import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-02-10T12:00:00Z'));
  await page.goto('/due-date');
});

test('due-date displays urgency, date and accessible labels at cutoff boundaries', async ({ page }) => {
  const date = page.getByLabel('Due date', { exact: true });
  const badge = page.locator('xuilib-due-date .due-date');
  await expect(badge).toHaveText('TODAY');
  await expect(badge).toHaveClass(/hmcts-badge--orange/);
  await expect(badge).toHaveAttribute('aria-label', 'This task is due to be completed today');
  await expect(badge).toHaveAttribute('title', 'This task is due to be completed today');
  await date.fill('2026-02-09');
  await expect(badge).toHaveText('+1 day');
  await expect(badge).toHaveClass(/hmcts-badge--red/);
  await expect(badge).toHaveAttribute('aria-label', 'This task is 1 day past its due date');
  await date.fill('2026-02-07');
  await expect(badge).toHaveText('+3 days');
  await expect(badge).toHaveAttribute('aria-label', 'This task is 3 days past its due date');
  await date.fill('2026-02-11');
  await expect(badge).toHaveText('11 Feb');
  await expect(badge).toHaveClass(/hmcts-badge--orange/);
  await expect(badge).toHaveAttribute('aria-label', 'This task is due to be completed by 11 February 2026');
  await date.fill('2026-02-12');
  await expect(badge).toHaveClass(/hmcts-badge--green/);
  await date.fill('');
  await expect(badge).toHaveCount(0);
  await date.fill('2026-02-10');
  await expect(badge).toHaveText('TODAY');
});

test('due-date updates urgency when thresholds change and high urgency wins', async ({ page }) => {
  const date = page.getByLabel('Due date', { exact: true });
  const high = page.getByLabel('High urgency cutoff');
  const medium = page.getByLabel('Medium urgency cutoff');
  const badge = page.locator('xuilib-due-date .due-date');
  await high.fill('1');
  await expect(badge).toHaveClass(/hmcts-badge--red/);
  await high.fill('0');
  await expect(badge).toHaveClass(/hmcts-badge--orange/);
  await date.fill('2026-02-12');
  await expect(badge).toHaveClass(/hmcts-badge--green/);
  await medium.fill('3');
  await expect(badge).toHaveClass(/hmcts-badge--orange/);
  await high.fill('3');
  await expect(badge).toHaveClass(/hmcts-badge--red/);
  await medium.fill('0');
  await expect(badge).toHaveClass(/hmcts-badge--red/);
  await high.fill('0');
  await expect(badge).toHaveClass(/hmcts-badge--green/);
});

test('due-date translates visible and accessible labels', async ({ page }) => {
  const badge = page.locator('xuilib-due-date .due-date');
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(badge).toHaveText('HEDDIW');
  await expect(badge).toHaveAttribute('aria-label', 'Mae’r dasg hon i fod i gael ei chwblhau heddiw');
  await expect(badge).toHaveAttribute('title', 'Mae’r dasg hon i fod i gael ei chwblhau heddiw');
});
