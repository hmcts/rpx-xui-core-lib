import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function checkPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function value(page, name) {
  return JSON.parse(await page.getByTestId(name).innerText());
}

function widgetState(page) {
  return page.evaluate(() => window.genericFilterFixture());
}

async function persistedFields(page) {
  const setting = await value(page, 'persisted');
  return Object.fromEntries(setting.fields.map(({ name, value }) => [name, value]));
}

async function selectSuggestion(page, input, term, name) {
  await input.fill(term);
  await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
  await input.press('ArrowDown');
  await input.press('Enter');
}

test('Work Allocation composes scalar service, booking location, person, task and work-type fields', async ({ page }) => {
  const errors = checkPageErrors(page);
  await page.goto('/generic-filter');
  const widget = page.locator('xuilib-generic-filter');
  await expect(widget.getByRole('combobox', { name: 'Service', exact: true })).toHaveValue('A');
  expect(await page.getByTestId('persisted').innerText()).toBe('null');

  const location = widget.getByRole('combobox', { name: 'Find a work location' });
  await expect(location).toBeEnabled();
  await selectSuggestion(page, location, 'Court Alpha', 'Court Alpha');
  await expect(widget.getByRole('radio', { name: 'Search for a location', exact: true })).toBeChecked();
  await expect.poll(() => value(page, 'work-lookup')).toEqual({
    url: 'api/locations/getLocations', serviceIds: 'A', type: 'case-management', term: 'Court Alpha',
    booking: [{ service: 'A', locations: [] }],
  });

  const person = widget.getByRole('combobox', { name: 'select a person' });
  await selectSuggestion(page, person, 'Alex', 'Alex Example (alex@example.com)');
  await expect.poll(() => value(page, 'person-lookup')).toEqual({
    searchTerm: 'Alex', userRole: 'Legal Ops', services: ['A'], userIncluded: false,
  });

  const task = widget.getByRole('combobox', { name: 'select a task name' });
  await selectSuggestion(page, task, 'Review', 'Review task');
  await expect.poll(() => value(page, 'task-service')).toBe('A');
  const workType = widget.getByRole('combobox', { name: 'Search for a work type by name' });
  await selectSuggestion(page, workType, 'routine', 'Routine work');
  await widget.getByRole('link', { name: 'Add work type' }).click();

  await widget.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('apply-count')).toHaveText('1');
  expect(await persistedFields(page)).toMatchObject({
    service: ['A'], 'location-scope': ['search'],
    location: [{ epimms_id: 'work-1', site_name: 'Court Alpha' }],
    person: [{ domain: 'Legal Ops', email: 'alex@example.com', id: 'person-1', name: 'Alex Example', knownAs: 'Alex' }],
    task: [{ task_type_id: 'review', task_type_name: 'Review task' }],
    'work-types': [{ key: 'routine', label: 'Routine work' }],
  });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('core-generic-filter-work')));
  expect(stored).toMatchObject({ ownerHash: 'a'.repeat(64), reset: false });

  await task.fill('');
  await expect.poll(async () => (await widgetState(page)).form.task).toEqual({ task_type_id: null, task_type_name: null });
  await widget.getByRole('radio', { name: 'All locations' }).check();
  await expect(location).toHaveValue('');
  await expect.poll(async () => (await widgetState(page)).form.location).toEqual([]);
  expect(errors).toEqual([]);
});

test('Work Allocation checkbox service lookup omits services_all and disabling clears all selected locations', async ({ page }) => {
  const errors = checkPageErrors(page);
  await page.goto('/generic-filter?mode=checkbox');
  const widget = page.locator('xuilib-generic-filter');
  await widget.getByRole('checkbox', { name: 'All services' }).check();
  await expect(widget.getByRole('checkbox', { name: 'Alpha service' })).toBeChecked();
  await expect(widget.getByRole('checkbox', { name: 'Beta service' })).toBeChecked();

  const input = widget.getByRole('combobox', { name: 'Find a work location' });
  for (const name of ['Court Alpha', 'Court Beta', 'Court Gamma']) {
    await input.fill(name);
    await expect(page.getByRole('option')).toHaveText([name]);
    await input.press('ArrowDown');
    await input.press('Enter');
    await widget.getByRole('link', { name: 'Add location' }).click();
    await expect(input).toHaveValue('');
  }
  await expect.poll(() => value(page, 'work-lookup')).toEqual({
    url: 'api/locations/getLocations', serviceIds: 'A,B', type: 'case-management', term: 'Court Gamma',
    booking: [{ service: 'A', locations: [] }],
  });
  await expect(widget.locator('.location-selection a')).toHaveText(['Court Alpha', 'Court Beta', 'Court Gamma']);
  await widget.getByRole('button', { name: 'Apply' }).click();
  expect((await persistedFields(page)).services).toEqual(['services_all', 'A', 'B']);
  await widget.getByRole('radio', { name: 'All locations' }).check();
  await expect(widget.locator('.location-selection')).toHaveCount(0);
  await expect.poll(async () => (await widgetState(page)).form.location).toEqual([]);
  await expect(input).toBeEnabled();
  expect(errors).toEqual([]);
});

test('Staff Admin titles its combobox, filters skills, and persists venue records from option-object services', async ({ page }) => {
  const errors = checkPageErrors(page);
  await page.goto('/generic-filter?mode=staff');
  const widget = page.locator('xuilib-generic-filter');
  const service = widget.locator('#user-services exui-search-service input');
  const skills = widget.getByRole('combobox', { name: 'Skills' });
  await expect(service).toHaveAccessibleName('Service');
  await expect(widget.getByRole('heading', { name: 'Service', exact: true })).toHaveCount(1);
  await expect(skills.getByRole('option', { name: 'Unmatched skill' })).toHaveCount(1);

  await service.fill('all');
  await expect(page.getByRole('listbox').getByRole('option', { name: 'All', exact: true })).toBeVisible();
  await expect(service).toHaveAttribute('aria-expanded', 'true');
  const audit = await new AxeBuilder({ page }).include('#user-services').include('.cdk-overlay-container')
    .withRules(['label', 'aria-input-field-name', 'aria-required-attr', 'aria-valid-attr-value', 'duplicate-id']).analyze();
  expect(audit.violations).toEqual([]);
  const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  await service.press('Enter');
  await widget.getByRole('link', { name: 'Add service' }).click();
  await expect(widget.locator('#user-services .hmcts-filter__tag')).toHaveText('All');
  await expect(skills.getByRole('option', { name: 'Unmatched skill' })).toHaveCount(0);

  const location = widget.getByRole('combobox', { name: 'Search for a location by name' });
  await location.fill('different site');
  await expect(page.getByRole('option', { name: 'No results found' })).toBeVisible();
  await selectSuggestion(page, location, 'ciVic', 'Civic hall');
  await expect.poll(() => value(page, 'reference-codes')).toEqual(['A', 'B']);
  await expect(page.getByTestId('work-lookup')).toHaveText('null');
  await widget.getByRole('link', { name: 'Add location' }).click();
  await expect(widget.locator('#user-location .hmcts-filter__tag')).toHaveText('Civic hall');

  await widget.getByRole('button', { name: 'Search' }).click();
  expect(await persistedFields(page)).toMatchObject({
    'user-services': [{ key: 'A', label: 'Alpha service' }, { key: 'B', label: 'Beta service' }],
    'user-location': [{ epimms_id: 'venue-1', venue_name: 'Civic hall' }],
  });
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('core-generic-filter-staff')));
  expect(stored.reset).toBe(false);

  await widget.locator('#user-services').getByRole('link', { name: 'All', exact: true }).click();
  await expect(widget.getByText('Please select a service')).toBeVisible();
  await expect(skills.getByRole('option', { name: 'Unmatched skill' })).toHaveCount(1);
  await widget.getByRole('button', { name: 'Search' }).click();
  expect((await persistedFields(page))['user-services']).toEqual([]);
  expect(errors).toEqual([]);
});

test('two composed service fields each have a unique input and a label that focuses only that input', async ({ page }) => {
  const errors = checkPageErrors(page);
  await page.goto('/generic-filter?mode=services');
  const widget = page.locator('xuilib-generic-filter');
  for (const [name, title, option, term] of [
    ['primary-service', 'Primary service', 'Alpha service', 'alpha'],
    ['secondary-service', 'Secondary service', 'Beta service', 'beta'],
  ]) {
    const field = widget.locator('#' + name);
    const label = field.locator('h3 label');
    const input = field.getByRole('combobox');
    await expect(label).toHaveText(title);
    await expect(input).toHaveAccessibleName(title);
    await expect(label).toHaveAttribute('for', await input.getAttribute('id'));
    await label.click();
    await expect(input).toBeFocused();
    await selectSuggestion(page, input, term, option);
    await field.getByRole('link', { name: 'Add service' }).click();
    await expect(field.locator('.hmcts-filter__tag')).toHaveText(option);
  }
  const ids = await widget.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(errors).toEqual([]);
});

test('invalid Apply exposes template errors and Reset rebinds edits to the active form', async ({ page }) => {
  const errors = checkPageErrors(page);
  await page.goto('/generic-filter?mode=validation');
  const widget = page.locator('xuilib-generic-filter');
  const name = widget.getByRole('textbox', { name: 'Name' });
  const email = widget.getByRole('textbox', { name: 'Email' });
  await expect(widget.getByText('Validation filters')).toBeVisible();
  await expect(name).toHaveValue('Seed name');
  await name.fill('ab');
  await email.fill('invalid');
  await widget.getByRole('checkbox', { name: 'Caseworker' }).check();
  await widget.getByRole('checkbox', { name: 'Administrator' }).check();
  await widget.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('apply-count')).toHaveText('1');
  expect(await value(page, 'errors')).toEqual([{ name: 'name', error: 'Enter at least three characters' }]);
  await expect(widget.getByText('Select only one role')).toBeVisible();
  await expect(widget.getByText('Enter an email address')).toBeVisible();
  await expect(page.getByTestId('persisted')).toHaveText('null');

  await widget.getByRole('checkbox', { name: 'Administrator' }).uncheck();
  await widget.getByRole('button', { name: 'Reset to default' }).click();
  await expect(page.getByTestId('cancel-count')).toHaveText('1');
  await expect(name).toHaveValue('Default name');
  expect((await value(page, 'persisted')).reset).toBe(true);
  await expect(page.getByTestId('errors')).toHaveText('null');

  await widget.getByRole('button', { name: 'Apply' }).click();
  await expect.poll(async () => (await widgetState(page)).submitted).toBe(true);
  expect((await value(page, 'persisted')).reset).toBe(false);
  await name.fill('next name');
  await expect.poll(async () => (await widgetState(page)).submitted).toBe(false);
  expect(errors).toEqual([]);
});
