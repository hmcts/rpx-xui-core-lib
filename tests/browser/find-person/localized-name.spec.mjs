import { test, expect } from '@playwright/test';
import { cachedTranslations } from '../i18n/cache.mjs';
import { delayWelshTranslation, translatedPersonName } from './translation-route.mjs';

test('accessible name remains meaningful across delayed translation and language switches', async ({ page }) => {
  const release = await delayWelshTranslation(page, translatedPersonName('Dewis person (synthetic)'));
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

for (const { title, response } of [
  { title: 'failed translation retains original accessible phrase', response: { status: 503, json: { error: 'synthetic failure' } } },
  { title: 'missing phrase falls back to original accessible phrase', response: { json: { translations: {} } } }
]) test(title, async ({ page }) => {
  const release = await delayWelshTranslation(page, route => route.fulfill(response));
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
  const release = await delayWelshTranslation(page, translatedPersonName('Dewis person (synthetic)'));
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
  await page.route('**/translations/cy', translatedPersonName('Dewis person (synthetic)'));
  await page.goto('/find-person?unique');
  const input = page.locator('#inputSelectPersonfirst');
  await page.getByRole('button', { name: 'Welsh' }).click();
  await expect(input).toHaveAccessibleName('Dewis person (synthetic)');
});

test('whitespace-only translation falls back to a non-blank accessible name', async ({ page }) => {
  const release = await delayWelshTranslation(page, translatedPersonName('   '));
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
