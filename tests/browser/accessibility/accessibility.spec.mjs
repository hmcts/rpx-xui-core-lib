import { expect, test } from '@playwright/test';

test('accessibility statement selects the application context and exposes service links', async ({ page }) => {
  for (const [query, expected] of [
    ['', 'Manage Organisation'],
    ['?manage-case', 'Manage Cases'],
    ['?xui-webapp', 'Manage Cases'],
    ['?xui-mo-webapp', 'Manage Organisation'],
    ['?manage-case&xui-mo-webapp', 'Manage Cases'],
  ]) {
    await page.goto(`/accessibility${query}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(expected);
  }
  await expect(page.getByRole('link', { name: 'Immigration and Asylum', exact: true })).toHaveAttribute('href', 'accessibility#immigration');
  await expect(page.locator('#immigration')).toBeVisible();
  const abilityNet = page.getByRole('link', { name: 'AbilityNet' });
  await expect(abilityNet).toHaveAttribute('href', 'https://mcmw.abilitynet.org.uk/');
  await expect(abilityNet).toHaveAttribute('target', '_blank');
  await expect(abilityNet).toHaveAttribute('rel', /noopener/);
});

test('accessibility statement translates its visible heading', async ({ page }) => {
  await page.goto('/accessibility?manage-case');
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Datganiad hygyrchedd MyHMCTS');
});
