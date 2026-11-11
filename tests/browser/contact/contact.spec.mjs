import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('contact links are keyboard reachable and remain accessible through data changes', async ({ page }) => {
  await page.goto('/contact');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show contact' })).toBeFocused();
  await page.keyboard.press('Enter');
  const contact = page.locator('xuilib-contact-details');
  await expect(contact.getByRole('heading', { name: 'Help desk' })).toBeVisible();
  for (const name of ['Cymraeg', 'Clear contact', 'Partial contact']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  const email = contact.getByRole('link', { name: 'help@example.test' });
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('href', 'mailto:help@example.test');
  await page.keyboard.press('Tab');
  const support = contact.getByRole('link', { name: 'Support site' });
  await expect(support).toBeFocused();
  await expect(support).toHaveAttribute('href', 'https://example.test/help');
  const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Partial contact' }).click();
  await expect(contact.getByRole('link')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Clear contact' }).click();
  await expect(contact.locator('.contact-details')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show contact' }).click();
  await expect(contact.getByRole('link')).toHaveCount(2);
  await page.route('https://example.test/help', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Support</title>' }));
  for (let step = 0; step < 5; step++) await page.keyboard.press('Tab');
  await expect(support).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('https://example.test/help');
});
