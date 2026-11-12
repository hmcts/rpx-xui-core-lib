import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/cookie/sub'); await page.waitForFunction(() => Boolean(window.cookieProbe)); });

test('cookie service writes a strict cookie with the current default path and expiry', async ({ page, context }) => {
  const expiry = new Date(Date.now() + 60_000).toUTCString();
  await page.evaluate(expiry => window.cookieProbe.setCookie('sample', 'value', expiry), expiry);
  const cookie = (await context.cookies()).find(item => item.name === 'sample');
  expect(cookie).toMatchObject({ value: 'value', path: '/cookie', sameSite: 'Strict' });
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000);
  await page.evaluate(() => window.cookieProbe.deleteCookie('sample'));
  expect((await context.cookies()).some(item => item.name === 'sample')).toBe(false);
  await page.evaluate(() => window.cookieProbe.setCookie('expired', 'value', 'Thu, 01 Jan 1970 00:00:01 GMT'));
  expect((await context.cookies()).some(item => item.name === 'expired')).toBe(false);
});

test('cookie deletion requires the matching real browser path and domain', async ({ page, context }) => {
  await context.addCookies([{name:'path_cookie',value:'v',domain:'127.0.0.1',path:'/cookie'}]);
  await page.evaluate(() => window.cookieProbe.deleteCookie('path_cookie', '/'));
  expect((await context.cookies()).some(item => item.name === 'path_cookie')).toBe(true);
  await page.evaluate(() => window.cookieProbe.deleteCookie('path_cookie', '/cookie', '127.0.0.1'));
  expect((await context.cookies()).some(item => item.name === 'path_cookie')).toBe(false);
});

test('cookie reads and prefix deletion preserve the legacy boundaries in a browser', async ({ page, context }) => {
  await context.addCookies([
    {name:'user_1',value:'one=two',domain:'127.0.0.1',path:'/cookie'},
    {name:'username',value:'three',domain:'127.0.0.1',path:'/cookie'},
    {name:'other',value:'four',domain:'127.0.0.1',path:'/cookie'}
  ]);
  const before = await page.evaluate(() => { let missing; try { window.cookieProbe.getCookie('absent'); } catch (error) { missing = error instanceof TypeError; } return { value: window.cookieProbe.getCookie('user_1'), present: window.cookieProbe.checkCookie('user'), missing }; });
  expect(before).toEqual({value:'one',present:false,missing:true});
  await page.evaluate(() => window.cookieProbe.deleteCookieByPartialMatch('user', '/cookie', '127.0.0.1'));
  const names=(await context.cookies()).map(item=>item.name);
  expect(names).toContain('other'); expect(names).not.toContain('user_1'); expect(names).not.toContain('username');
});
