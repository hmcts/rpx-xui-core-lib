import { expect, test } from '@playwright/test';
test('session storage isolates independent tabs and supports remove-after-read', async ({ context }) => {
  const first = await context.newPage(); const second = await context.newPage();
  await Promise.all([first.goto('/session-storage'), second.goto('/session-storage')]);
  await Promise.all([first.waitForFunction(() => Boolean(window.sessionStorageProbe)), second.waitForFunction(() => Boolean(window.sessionStorageProbe))]);
  await first.evaluate(() => window.sessionStorageProbe.setItem('synthetic-key', 'synthetic-value'));
  expect(await second.evaluate(() => window.sessionStorageProbe.getItem('synthetic-key'))).toBeNull();
  expect(await first.evaluate(() => window.sessionStorageProbe.getItem('synthetic-key', true))).toBe('synthetic-value');
  expect(await first.evaluate(() => window.sessionStorageProbe.getItem('synthetic-key'))).toBeNull();
});
