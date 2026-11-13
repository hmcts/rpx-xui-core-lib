import { expect, test } from '@playwright/test';
test('filter local storage checks owner across independent tabs', async ({ context }) => {
  const first = await context.newPage(); const second = await context.newPage();
  await Promise.all([first.goto('/filter-state'), second.goto('/filter-state')]);
  await Promise.all([first.waitForFunction(() => Boolean(window.filterProbe)), second.waitForFunction(() => Boolean(window.filterProbe))]);
  await first.evaluate(() => { sessionStorage.setItem('userDetails', JSON.stringify({filterOwnerHash:'synthetic-owner'})); window.filterProbe.persist({id:'synthetic-filter',fields:[]}, 'local'); });
  await second.evaluate(() => sessionStorage.setItem('userDetails', JSON.stringify({filterOwnerHash:'synthetic-owner'})));
  expect(await second.evaluate(() => window.filterProbe.get('synthetic-filter')?.ownerHash)).toBe('synthetic-owner');
  await second.evaluate(() => sessionStorage.setItem('userDetails', JSON.stringify({filterOwnerHash:'different-owner'})));
  expect(await second.evaluate(() => window.filterProbe.get('synthetic-filter'))).toBeNull();
});
