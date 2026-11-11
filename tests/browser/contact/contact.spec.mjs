import { expect, test } from '@playwright/test';

test('contact details show optional fields and translate labels', async ({ page }) => {
  await page.goto('/contact');
  const contact = page.locator('xuilib-contact-details');
  await expect(contact.locator('.contact-details')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show contact' }).click();
  await expect(contact.getByRole('heading', { name: 'Help desk' })).toBeVisible();
  await expect(contact.locator('.hmcts-badge')).toHaveClass('hmcts-badge hmcts-badge--blue');
  await expect(contact.getByRole('link', { name: 'help@example.test' })).toHaveAttribute('href', 'mailto:help@example.test');
  await expect(contact.getByRole('link', { name: 'Support site' })).toHaveAttribute('href', 'https://example.test/help');
  await expect(contact.locator('.phone')).toHaveText('Phone: 0300 123 4567');
  await expect(contact.locator('.opening-times')).toHaveText('Opening times: Monday to Friday');
  const response = page.waitForResponse('**/translations/cy');
  await page.getByRole('button', { name: 'Cymraeg' }).click();
  expect((await response).status()).toBe(200);
  await expect(contact.locator('.phone')).toHaveText('Ffôn: 0300 123 4567');
  await page.getByRole('button', { name: 'Clear contact' }).click();
  await expect(contact.locator('.contact-details')).toHaveCount(0);
  await page.getByRole('button', { name: 'Partial contact' }).click();
  await expect(contact.getByRole('heading', { name: 'Help desk' })).toBeVisible();
  await expect(contact.locator('.hmcts-badge')).toHaveText('Open');
  await expect(contact.locator('.opening-times')).toContainText('Monday to Friday');
  await expect(contact.locator('.email')).toHaveCount(0);
  await expect(contact.locator('.phone')).toHaveCount(0);
  await expect(contact.locator('.contactDetails')).toHaveCount(0);
});
