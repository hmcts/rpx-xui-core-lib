import { expect, test } from '@playwright/test';

test('task-name lookup rejects an old response after input changes', async ({ page }) => {
  await page.goto('/task-lookups');
  const input = page.locator('#inputSelectTaskName');
  await input.fill('old'); await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(1);
  await input.fill('new'); await page.evaluate(() => window.lookupHarness.answerTask(0, 'old'));
  await expect(page.getByRole('option', { name: 'old' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(2);
  await page.evaluate(() => window.lookupHarness.answerTask(1, 'new'));
  await expect(page.getByRole('option', { name: 'new' })).toBeVisible();
});

test('work-type lookup rejects an old response after input changes', async ({ page }) => {
  await page.goto('/task-lookups');
  const input = page.locator('#inputWorkTypeSearch');
  await input.fill('old'); await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[1])).toBe(1);
  await input.fill('new'); await page.evaluate(() => window.lookupHarness.answerWork(0, 'old'));
  await expect(page.getByRole('option', { name: 'old' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[1])).toBe(2);
  await page.evaluate(() => window.lookupHarness.answerWork(1, 'new'));
  await expect(page.getByRole('option', { name: 'new' })).toBeVisible();
});

test('task-name shows no-results only after an empty successful response', async ({ page }) => {
  await page.goto('/task-lookups'); const input = page.locator('#inputSelectTaskName');
  await input.fill('missing'); await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(1);
  await page.evaluate(() => window.lookupHarness.emptyTask(0));
  await expect(page.getByRole('option', { name: 'No results found' })).toBeVisible();
  await input.fill('new'); await expect(page.getByRole('option', { name: 'No results found' })).toHaveCount(0);
});

test('task-name reports a service failure and recovers on later input', async ({ page }) => {
  await page.goto('/task-lookups'); const input = page.locator('#inputSelectTaskName');
  await input.fill('first'); await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(1);
  await page.evaluate(() => window.lookupHarness.failTask(0));
  await expect(page.getByRole('alert')).toContainText('Unable to search for task names. Try again.');
  await expect(page.getByRole('option', { name: 'No results found' })).toHaveCount(0);
  await input.fill('second'); await expect(page.getByRole('alert')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(2);
  await page.evaluate(() => window.lookupHarness.answerTask(1, 'second'));
  await expect(page.getByRole('option', { name: 'second' })).toBeVisible();
});

test('work-type parent initializes disabled without an Angular error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/task-lookups?parent&disabled');
  const input = page.locator('#inputWorkTypeSearch');
  await expect(input).toBeEnabled();
  await input.fill('work');
  await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[1])).toBe(1);
  expect(errors).toEqual([]);
});

test('task-name retained parent control emits after recreation', async ({ page }) => {
  await page.goto('/task-lookups?retained'); const input = page.locator('#inputSelectTaskName');
  await expect(input).toHaveValue('Retained'); await input.fill('abc');
  await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(1);
  await expect(page.getByTestId('task-selected')).toHaveText('null');
  await page.getByRole('button', { name: 'Toggle task component' }).click(); await expect(input).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle task component' }).click(); await expect(input).toHaveValue('abc');
  await input.fill('def'); await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(2);
});

test('task-name instance suffixes isolate descriptions while work-type retains legacy IDs', async ({ page }) => {
  await page.goto('/task-lookups?duplicates');
  await expect(page.locator('[id="inputSelectTaskName"]')).toHaveCount(1);
  await expect(page.locator('[id="inputSelectTaskNamesecond"]')).toHaveCount(1);
  await expect(page.locator('[id="inputWorkTypeSearch"]')).toHaveCount(2);
  await expect(page.locator('#inputSelectTaskName')).toHaveAttribute('aria-describedby', 'sub-title-hint');
  await expect(page.locator('#inputSelectTaskNamesecond')).toHaveAttribute('aria-describedby', 'sub-title-hintsecond');
  await expect(page.locator('[id="sub-title-hint"]')).toHaveCount(1);
  await expect(page.locator('[id="sub-title-hintsecond"]')).toHaveCount(1);
});

test('task-name reports a malformed response and accepts a later valid result', async ({ page }) => {
  await page.goto('/task-lookups'); const input = page.locator('#inputSelectTaskName');
  await input.fill('first'); await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(1);
  await page.evaluate(() => window.lookupHarness.malformedTask(0));
  await expect(page.getByRole('alert')).toContainText('Unable to search for task names. Try again.');
  await expect(page.getByRole('option', { name: 'No results found' })).toHaveCount(0);
  await input.fill('second'); await expect(page.getByRole('alert')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(2);
  await page.evaluate(() => window.lookupHarness.answerTask(1, 'second'));
  await expect(page.getByRole('option', { name: 'second' })).toBeVisible();
});

for (const cached of [false, true]) {
  test(`work-type ${cached ? 'cached-service' : 'default'} lookup reports error and recovers`, async ({ page }) => {
    await page.goto(cached ? '/task-lookups?cached' : '/task-lookups');
    const input = page.locator('#inputWorkTypeSearch');
    await input.fill('first'); await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[1])).toBe(1);
    await page.evaluate(() => window.lookupHarness.failWork(0));
    await expect(page.getByRole('alert')).toContainText('Unable to search for work types. Try again.');
    await expect(page.getByRole('option', { name: 'No results found' })).toHaveCount(0);
    await input.fill('second'); await expect(page.getByRole('alert')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[1])).toBe(2);
    await page.evaluate(() => window.lookupHarness.answerWork(1, 'Second'));
    await expect(page.getByRole('option', { name: 'Second' })).toBeVisible();
  });
}

for (const outcome of ['success', 'error']) {
  test(`task-name ignores stale ${outcome} after the service changes`, async ({ page }) => {
    await page.goto('/task-lookups');
    const input = page.locator('#inputSelectTaskName');
    await input.fill('old');
    await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(1);
    await page.getByRole('button', { name: 'Change task service' }).click();
    if (outcome === 'success') await page.evaluate(() => window.lookupHarness.answerTask(0, 'old'));
    else await page.evaluate(() => window.lookupHarness.failTask(0));
    expect(await page.evaluate(() => window.lookupHarness.taskOptions())).toEqual([]);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await input.fill('new');
    await expect.poll(() => page.evaluate(() => window.lookupHarness.counts()[0])).toBe(2);
    await page.evaluate(() => window.lookupHarness.answerTask(1, 'new'));
    await expect(page.getByRole('option', { name: 'new' })).toBeVisible();
  });
}
