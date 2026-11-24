import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { CapitalizePipe } from '@hmcts/rpx-xui-core-lib/ui/capitalize';
import { GenericFilterComponent } from '@hmcts/rpx-xui-core-lib/ui/generic-filter';

const option = (key, label = key) => ({ key, label });
const makeField = (/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterFieldConfig['type']} */ type, name, extra = {}) => ({
  type, name, minSelected: 0, maxSelected: 0, options: [], ...extra,
});
const setting = (values, id = 'filter') => ({
  id, fields: Object.entries(values).map(([name, value]) => ({ name, value })),
});

function fixture(fields, config = {}, seed = null, cached = null) {
  const calls = [];
  const givenErrors = new BehaviorSubject(null);
  const service = {
    givenErrors,
    get: () => cached,
    persist: (value, persistence) => { calls.push(['persist', value, persistence]); },
  };
  const component = new GenericFilterComponent(
    /** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterService} */ (/** @type {unknown} */ (service)),
    new FormBuilder(),
    /** @type {import('@angular/core').ChangeDetectorRef} */ (/** @type {unknown} */ ({ markForCheck() {} })),
  );
  component.config = {
    id: 'filter', fields, persistence: 'memory', applyButtonText: 'Apply',
    cancelButtonText: 'Reset to default', cancelSetting: setting({}),
    ...config,
  };
  if (seed !== null) component.settings = seed;
  component.ngOnInit();
  return { component, calls, givenErrors };
}

test('Capitalize lowers the input and capitalizes only the first character', () => {
  const pipe = new CapitalizePipe();
  assert.equal(pipe.transform('sERVICE tYPES'), 'Service types');
  assert.equal(pipe.transform(''), '');
  assert.equal(pipe.transform(' TWO WORDS'), ' two words');
});

test('all 14 field types restore their form shapes and project their saved records', () => {
  const all = { ...option('services_all'), selectAll: true };
  const alpha = option('A');
  const beta = option('B');
  const skill = option('1');
  const fields = [
    makeField('group-title', 'all FILTERS'),
    makeField('select', 'service', { options: [alpha, beta] }),
    makeField('radio', 'scope', { options: [option('All'), option('search')] }),
    makeField('checkbox', 'boxes', { options: [all, alpha, beta] }),
    makeField('checkbox-large', 'large', { options: [alpha, beta] }),
    makeField('group-select', 'grouped', { groupOptions: [{ group: 'A', options: [skill] }] }),
    makeField('text-input', 'text'),
    makeField('email-input', 'email'),
    makeField('find-person', 'person'),
    makeField('find-task-name', 'task'),
    makeField('find-service', 'services', { options: [alpha, beta] }),
    makeField('find-location', 'location'),
    makeField('find-work-type', 'work-types'),
    makeField('nested-checkbox', 'nested', { options: [skill] }),
  ];
  const initial = setting({
    service: ['A'], scope: ['search'], boxes: ['services_all', 'A', 'B'], large: ['B'],
    grouped: ['1'], text: ['Example'], email: ['example@example.com'],
    person: [{ domain: 'LEGAL_OPERATIONS', email: 'caseworker@example.com', id: 'person-1', name: 'Alex Example', knownAs: 'Alex' }],
    task: [{ task_type_id: 'review', task_type_name: 'Review task' }],
    services: [alpha], location: [{ epimms_id: 'venue-1' }], 'work-types': [option('routine')], nested: ['1'],
  });
  const { component, calls } = fixture(fields, {}, initial);
  const { form } = component;
  assert.equal(form.get('all FILTERS'), null);
  assert.deepEqual(form.get('boxes').value, [true, true, true]);
  assert.deepEqual(form.get('large').value, [false, true]);
  assert.deepEqual(form.get('nested').value, [true]);
  for (const key of ['person', 'task']) assert.ok(form.get(key) instanceof FormGroup);
  for (const key of ['services', 'location', 'work-types']) assert.ok(form.get(key) instanceof FormArray);
  for (const key of ['service', 'scope', 'grouped', 'text', 'email']) assert.ok(form.get(key) instanceof FormControl);
  component.applyFilter(form);
  assert.deepEqual(calls, [['persist', { ...initial, reset: false }, 'memory']]);
});

test('configured defaults yield to explicit settings and the stored setting takes precedence', () => {
  const fields = [makeField('text-input', 'name')];
  const config = { cancelSetting: setting({ name: ['default'] }) };
  assert.equal(fixture(fields, config).component.form.get('name').value, 'default');
  assert.equal(fixture(fields, config, setting({ name: ['seed'] })).component.form.get('name').value, 'seed');
  const cached = setting({ name: ['cached'] });
  assert.equal(fixture(fields, config, setting({ name: ['seed'] }), cached).component.form.get('name').value, 'cached');
  assert.equal(fixture(fields, config, null, cached).component.form.get('name').value, 'cached');
});

test('Apply emits the upstream public errors and callback order, then persists a valid projection', () => {
  const order = [];
  const { component, givenErrors, calls } = fixture([
    makeField('text-input', 'name', { minSelected: 3, minSelectedError: 'Three characters required' }),
    makeField('checkbox', 'roles', { options: [option('A'), option('B')], maxSelected: 1, maxSelectedError: 'At most one role' }),
    makeField('email-input', 'email', { minSelected: 1, minSelectedError: 'Email required', emailError: 'Invalid email' }),
  ], { applyButtonCallback: () => order.push(['callback', calls.length]) });
  givenErrors.subscribe(errors => order.push(['errors', errors]));
  component.form.get('name').setValue('ab');
  component.form.get('roles').setValue([true, true]);
  component.form.get('email').setValue('invalid');
  component.applyFilter(component.form);
  assert.equal(component.submitted, true);
  assert.equal(component.form.touched, true);
  assert.deepEqual(component.form.get('roles').errors, { maxLength: true });
  assert.deepEqual(component.form.get('email').errors, { email: true });
  assert.deepEqual(order, [['errors', null], ['errors', [{ name: 'name', error: 'Three characters required' }]], ['callback', 0]]);
  assert.deepEqual(calls, []);
  component.form.get('email').setValue('');
  component.applyFilter(component.form);
  assert.deepEqual(givenErrors.value, [
    { name: 'name', error: 'Three characters required' }, { name: 'email', error: 'Email required' },
  ]);
  assert.deepEqual(calls, []);
  component.form.patchValue({ name: 'abc', roles: [true, false], email: 'valid@example.com' });
  assert.equal(component.submitted, false);
  component.applyFilter(component.form);
  assert.deepEqual(order.slice(-2), [['errors', null], ['callback', 1]]);
  assert.deepEqual(calls, [['persist', { ...setting({ name: ['abc'], roles: ['A'], email: ['valid@example.com'] }), reset: false }, 'memory']]);
});

test('Reset, Apply and edit observe the active form, detach the old form, then unsubscribe on destroy', () => {
  const order = [];
  const defaults = setting({ name: ['default'] });
  const { component, calls, givenErrors } = fixture([makeField('text-input', 'name')], {
    cancelSetting: defaults,
    cancelButtonCallback: () => order.push(['cancel', calls.length]),
  }, setting({ name: ['seed'] }));
  givenErrors.subscribe(errors => order.push(['errors', errors]));
  const initial = component.form;
  component.cancelFilter();
  assert.notEqual(component.form, initial);
  assert.equal(component.form.get('name').value, 'default');
  assert.equal(component.submitted, false);
  assert.deepEqual(calls, [['persist', { ...defaults, reset: true }, 'memory']]);
  assert.deepEqual(order, [['errors', null], ['errors', null], ['cancel', 1]]);

  component.applyFilter(component.form);
  initial.get('name').setValue('old form edit');
  assert.equal(component.submitted, true);
  component.form.get('name').setValue('active form edit');
  assert.equal(component.submitted, false);
  component.applyFilter(component.form);
  givenErrors.next([{ name: 'name', error: 'Stale' }]);
  component.ngOnDestroy();
  component.form.get('name').setValue('edit after detach');
  assert.equal(component.submitted, true);
  assert.deepEqual(order.at(-1), ['errors', null]);
});

test('Reset restores checkbox, location and service arrays from the configured defaults before reapplying', () => {
  const stale = option('old');
  const current = option('default');
  const staleLocation = { epimms_id: 'stale-venue' };
  const defaultLocation = { epimms_id: 'default-venue' };
  const fields = [
    makeField('checkbox', 'checkboxes', { options: [stale, current] }),
    makeField('find-location', 'location'),
    makeField('find-service', 'services', { options: [stale, current] }),
  ];
  const seed = setting({ checkboxes: ['old'], location: [staleLocation], services: [stale] });
  const defaults = setting({ checkboxes: ['default'], location: [defaultLocation], services: [current] });
  const { component, calls } = fixture(fields, { cancelSetting: defaults }, seed);

  assert.deepEqual(component.form.value, { checkboxes: [true, false], location: [staleLocation], services: [stale] });
  component.cancelFilter();
  assert.deepEqual(calls, [['persist', { ...defaults, reset: true }, 'memory']]);
  assert.deepEqual(component.form.value, { checkboxes: [false, true], location: [defaultLocation], services: [current] });
  component.applyFilter(component.form);
  assert.deepEqual(calls.at(-1), ['persist', { ...defaults, reset: false }, 'memory']);
});

test('Reset still empties the work-type form array even when a work-type default is configured', () => {
  const defaults = setting({ workTypes: [option('default')] });
  const seed = setting({ workTypes: [option('old')] });
  const { component, calls } = fixture([makeField('find-work-type', 'workTypes')], { cancelSetting: defaults }, seed);
  assert.deepEqual(component.form.get('workTypes').value, [option('old')]);
  component.cancelFilter();
  assert.deepEqual(component.form.get('workTypes').value, []);
  component.applyFilter(component.form);
  assert.deepEqual(calls.at(-1), ['persist', { ...setting({ workTypes: [] }), reset: false }, 'memory']);
});

test('copyFields may return a replacement FormGroup used for Apply and edits', () => {
  const replacement = new FormGroup({ name: new FormControl('copied') });
  /** @type {FormGroup | undefined} */
  let original;
  const { component, calls } = fixture([makeField('text-input', 'name')], {
    copyFields: form => { original = form; return replacement; },
  });
  assert.ok(original);
  assert.notEqual(original, replacement);
  assert.equal(component.form, replacement);
  component.applyFilter(component.form);
  original.get('name').setValue('original');
  assert.equal(component.submitted, true);
  replacement.get('name').setValue('updated');
  assert.equal(component.submitted, false);
  assert.deepEqual(calls, [['persist', { ...setting({ name: ['copied'] }), reset: false }, 'memory']]);
});

test('conditional fields toggle required validators, location reset and radio activation', () => {
  const location = makeField('find-location', 'venue', { enableCondition: 'scope=search', radioSelectionChange: 'scope=search' });
  const person = makeField('find-person', 'person', { showCondition: 'scope=search' });
  const { component } = fixture([makeField('radio', 'scope'), location, person], {}, setting({ scope: ['All'] }));
  assert.equal(component.disabled(location, component.form), true);
  assert.equal(component.hidden(person, component.form), true);
  assert.equal(component.form.get('person.email').errors, null);
  component.inputChanged(location);
  assert.equal(component.form.get('scope').value, 'search');
  assert.equal(component.disabled(location, component.form), null);
  assert.equal(component.hidden(person, component.form), false);
  assert.deepEqual(component.form.get('person.email').errors, { required: true });
});

test('nested skill checkbox selection maps back to keys and keeps the selected groups', () => {
  const services = makeField('checkbox', 'user-services', { options: [option('A'), option('B')] });
  const skills = makeField('nested-checkbox', 'user-skills', {
    options: [option('1'), option('2')],
    groupOptions: [{ group: 'A', options: [option('1')] }, { group: 'B', options: [option('2')] }],
  });
  const { component, calls } = fixture([services, skills], {}, setting({ 'user-services': ['B'], 'user-skills': ['2'] }));
  assert.deepEqual(component.filteredSkillsByServicesCheckbox, [option('2')]);
  assert.deepEqual(component.form.get('user-skills').value, [true]);
  component.applyFilter(component.form);
  assert.deepEqual(calls[0][1].fields, setting({ 'user-services': ['B'], 'user-skills': ['2'] }).fields);
});

test('known person and task values update only declared controls and the task clear sentinel empties task fields', () => {
  const person = makeField('find-person', 'person');
  const task = makeField('find-task-name', 'task');
  const { component } = fixture([person, task]);
  component.updatePersonControls({ name: 'Alex Example', email: 'alex@example.com', unrelated: 'ignore' }, person);
  assert.equal(component.form.get('person.name').value, 'Alex Example');
  assert.equal(component.form.get('person.unrelated'), null);
  component.updatePersonControls(null, person);
  assert.equal(component.form.get('person.email').value, null);
  component.updateTaskNameControls({ task_type: { task_type_id: 'review', task_type_name: 'Review task' } }, task);
  assert.deepEqual(component.form.get('task').value, { task_type_id: 'review', task_type_name: 'Review task' });
  assert.throws(() => component.updateTaskNameControls(null, task), TypeError);
  assert.throws(() => component.updateTaskNameControls(undefined, task), TypeError);
  component.updateTaskNameControls('null', task);
  assert.deepEqual(component.form.get('task').value, { task_type_id: null, task_type_name: null });
});
