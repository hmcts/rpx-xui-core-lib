import { test, expect } from '@playwright/test';
import { cachedTranslations } from '../i18n/cache.mjs';

test('accessible name remains meaningful across delayed translation and language switches', async ({ page }) => {
  let release = () => {};
  const gate = new Promise(resolve => { release = () => resolve(undefined); });
  await page.route('**/translations/cy', async route => {
    await gate;
    const phrases = route.request().postDataJSON().phrases;
    await route.fulfill({ json: { translations: Object.fromEntries(phrases.map(p => [p, p === 'select a person' ? 'Dewis person (synthetic)' : p])) } });
  });
  await page.goto('/find-person?unique');
  const input = page.locator('#inputSelectPersonfirst');
  await expect(input).toHaveAccessibleName('select a person');
  await page.getByRole('button', { name: 'Welsh' }).click();
  await expect(input).toHaveAccessibleName('select a person [Translation in progress]');
  release();
  await expect(input).toHaveAccessibleName('Dewis person (synthetic)');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(input).toHaveAccessibleName('select a person');
});

test('failed translation retains original accessible phrase', async ({ page }) => {
  let release = () => {};
  const gate = new Promise(resolve => { release = () => resolve(undefined); });
  await page.route('**/translations/cy', async route => { await gate; await route.fulfill({ status: 503, json: { error: 'synthetic failure' } }); });
  await page.goto('/find-person?unique');
  const input = page.locator('#inputSelectPersonfirst');
  const completed = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Welsh' }).click();
  await expect(input).toHaveAccessibleName('select a person [Translation in progress]');
  release();
  await completed;
  await expect(input).toHaveAccessibleName('select a person');
});

test('missing phrase falls back to original accessible phrase', async ({ page }) => {
  let release = () => {};
  const gate = new Promise(resolve => { release = () => resolve(undefined); });
  await page.route('**/translations/cy', async route => { await gate; await route.fulfill({ json: { translations: {} } }); });
  await page.goto('/find-person?unique');
  const input = page.locator('#inputSelectPersonfirst');
  const completed = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Welsh' }).click();
  await expect(input).toHaveAccessibleName('select a person [Translation in progress]');
  release();
  await completed;
  await expect(input).toHaveAccessibleName('select a person');
});

test('late Welsh translation cannot overwrite the selected English name', async ({ page }) => {
  let release = () => {};
  const gate = new Promise(resolve => { release = () => resolve(undefined); });
  await page.route('**/translations/cy', async route => {
    await gate;
    const phrases = route.request().postDataJSON().phrases;
    await route.fulfill({ json: { translations: Object.fromEntries(phrases.map(p => [p, p === 'select a person' ? 'Dewis person (synthetic)' : p])) } });
  });
  await page.goto('/find-person?unique');
  const input = page.locator('#inputSelectPersonfirst');
  const completed = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Welsh' }).click();
  await expect(input).toHaveAccessibleName('select a person [Translation in progress]');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(input).toHaveAccessibleName('select a person');
  release();
  await completed;
  await expect.poll(() => cachedTranslations(page)).toEqual(expect.arrayContaining([expect.objectContaining({ phrase: 'select a person', lang: 'cy', translation: { translation: 'Dewis person (synthetic)' } })]));
  await expect(input).toHaveAccessibleName('select a person');
});

test('completed Welsh response replaces the English accessible name', async ({ page }) => {
  await page.route('**/translations/cy', route => {
    const phrases = route.request().postDataJSON().phrases;
    return route.fulfill({ json: { translations: Object.fromEntries(phrases.map(p => [p, p === 'select a person' ? 'Dewis person (synthetic)' : p])) } });
  });
  await page.goto('/find-person?unique');
  const input = page.locator('#inputSelectPersonfirst');
  await page.getByRole('button', { name: 'Welsh' }).click();
  await expect(input).toHaveAccessibleName('Dewis person (synthetic)');
});

test('whitespace-only translation falls back to a non-blank accessible name', async ({ page }) => {
  let release = () => {};
  const gate = new Promise(resolve => { release = () => resolve(undefined); });
  await page.route('**/translations/cy', async route => {
    await gate;
    const phrases = route.request().postDataJSON().phrases;
    await route.fulfill({ json: { translations: Object.fromEntries(phrases.map(p => [p, p === 'select a person' ? '   ' : p])) } });
  });
  await page.goto('/find-person?unique');
  const input = page.locator('#inputSelectPersonfirst');
  const completed = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Welsh' }).click();
  await expect(input).toHaveAccessibleName('select a person [Translation in progress]');
  release();
  await completed;
  await expect.poll(() => cachedTranslations(page)).toEqual(expect.arrayContaining([expect.objectContaining({ phrase: 'select a person', lang: 'cy', translation: { translation: '   ' } })]));
  await expect(input).toHaveAccessibleName('select a person');
});
