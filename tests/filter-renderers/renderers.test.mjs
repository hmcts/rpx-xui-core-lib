import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { MatOptionSelectionChange } from '@angular/material/core';
import { Subject } from 'rxjs';
import { FindLocationComponent } from '@hmcts/rpx-xui-core-lib/ui/find-location';
import { FindServiceComponent } from '@hmcts/rpx-xui-core-lib/ui/find-service';
import { SearchLocationComponent } from '@hmcts/rpx-xui-core-lib/ui/search-location';
import { SearchServiceComponent } from '@hmcts/rpx-xui-core-lib/ui/search-service';

const alpha = { key: 'A', label: 'Alpha service' };
const beta = { key: 'B', label: 'Beta service' };
const all = { key: 'All', label: 'All', selectAll: true };
const locations = ['A', 'B', 'C'].map(key => ({ epimms_id: key, site_name: `Court ${key}` }));

function setupLocation(maxSelected = 3, selected = []) {
  const component = new FindLocationComponent();
  const selectedLocations = new FormArray(selected.map(value => new FormControl(value)));
  const submission = new Subject();
  let resets = 0;
  component.searchLocationComponent = new SearchLocationComponent(null, null, null);
  component.searchLocationComponent.searchTermFormControl.valueChanges.subscribe(() => { resets++; });
  component.form = new FormGroup({ locations: selectedLocations });
  component.field = { name: 'locations', type: 'find-location', minSelected: 0, maxSelected, options: [], findLocationField: 'services' };
  component.fields = [];
  component.formSubmissionEvent$ = submission;
  component.ngOnInit();
  return { component, selectedLocations, submission, resetCount: () => resets };
}

function setupService(field = {}) {
  const component = new FindServiceComponent();
  const selectedServices = new FormArray([]);
  const submission = new Subject();
  const search = new SearchServiceComponent();
  component.searchServiceComponent = search;
  component.field = { name: 'services', type: 'find-service', minSelected: 0, maxSelected: 3, options: [beta, all, alpha], enableAddButton: true, ...field };
  component.form = new FormGroup({ services: selectedServices });
  component.formSubmissionEvent$ = submission;
  return { component, selectedServices, submission, search };
}

test('disabling a location search clears all three selections and resets its search term once', () => {
  const { component, selectedLocations, resetCount } = setupLocation(3, locations);
  component.disabled = true;
  assert.deepEqual(selectedLocations.value, []);
  assert.equal(resetCount(), 1);
  assert.equal(component.disabled, null);
});

test('location lookup preserves the fallback, scalar values and ordered checkbox service keys', () => {
  const { component } = setupLocation();
  component.services = 'A';
  assert.equal(component.serviceIds, 'SSCS,IA');

  component.fields = [{
    name: 'services', type: 'checkbox', minSelected: 0, maxSelected: 2,
    options: [{ key: 'services_all', label: 'All' }, alpha, beta],
  }];
  component.services = 'B';
  assert.equal(component.serviceIds, 'B');
  component.services = [true, false, 'checked'];
  assert.equal(component.serviceIds, 'B');
  component.services = [true, true, true];
  assert.equal(component.serviceIds, 'A,B');
  component.services = [true, false, false];
  assert.equal(component.serviceIds, '');
});

test('location selection commits via Add, removes by ID without a search event and resets on submission', () => {
  const { component, selectedLocations, submission, resetCount } = setupLocation();
  let searchChanges = 0;
  component.locationFieldChanged.subscribe(() => { searchChanges++; });
  component.onLocationSelected(locations[0]);
  assert.deepEqual(selectedLocations.value, []);
  component.addLocation();
  assert.deepEqual(selectedLocations.value, [locations[0]]);
  component.onLocationSelected({ ...locations[0] });
  component.addLocation();
  assert.deepEqual(selectedLocations.value, [locations[0]]);
  component.removeLocation({ ...locations[0] });
  assert.deepEqual(selectedLocations.value, []);
  assert.equal(searchChanges, 0);
  component.onSearchInputChanged();
  assert.equal(searchChanges, 1);

  submission.next();
  assert.equal(resetCount(), 2);
  component.ngOnDestroy();
  submission.next();
  assert.equal(resetCount(), 2);
});

test('single location selection commits immediately, survives submission and clears on typing', () => {
  const { component, selectedLocations, submission, resetCount } = setupLocation(1);
  component.onLocationSelected(locations[0]);
  component.onLocationSelected(locations[1]);
  assert.deepEqual(selectedLocations.value, [locations[1]]);
  submission.next();
  assert.equal(resetCount(), 0);
  component.onInputChanged(null);
  assert.deepEqual(selectedLocations.value, [locations[1]]);
  component.onInputChanged('court');
  assert.deepEqual(selectedLocations.value, []);
  submission.next();
  assert.equal(resetCount(), 1);
});

test('removing Select All clears the service form and emits exactly once after the form and tags update', () => {
  const { component, selectedServices } = setupService();
  component.ngOnInit();
  const changes = [];
  component.serviceFieldChanged.subscribe(() => {
    changes.push({ form: selectedServices.value, tags: component.selectedServices });
  });

  component.onOptionSelected(all);
  assert.deepEqual(selectedServices.value, []);
  component.addOption(component.tempSelectedService);
  assert.deepEqual(changes, [{ form: [alpha, beta], tags: [all] }]);
  component.removeOption(all);
  assert.deepEqual(selectedServices.value, []);
  assert.deepEqual(changes, [{ form: [alpha, beta], tags: [all] }, { form: [], tags: [] }]);
});

test('service defaults, replacement of All and removal use the configured option objects', () => {
  const { component, selectedServices } = setupService({ defaultOption: all });
  component.ngOnInit();
  assert.deepEqual(component.selectedServices, [all]);
  assert.deepEqual(selectedServices.value, [alpha, beta]);
  let changes = 0;
  component.serviceFieldChanged.subscribe(() => { changes++; });

  component.addOption(beta);
  assert.deepEqual(component.selectedServices, [beta]);
  assert.equal(selectedServices.at(0).value, beta);
  component.removeOption({ ...beta, key: 'b' });
  assert.deepEqual(selectedServices.value, []);
  assert.equal(changes, 2);
});

test('service submission clears a draft term, keeps an immediate single selection and unsubscribes on destroy', () => {
  const draft = setupService();
  draft.component.ngOnInit();
  draft.search.searchTerm = 'draft';
  draft.submission.next();
  assert.equal(draft.search.searchTerm, '');
  draft.component.ngOnDestroy();
  draft.search.searchTerm = 'after destroy';
  draft.submission.next();
  assert.equal(draft.search.searchTerm, 'after destroy');

  const single = setupService({ maxSelected: 1, enableAddButton: false });
  single.component.ngOnInit();
  let changes = 0;
  single.component.serviceFieldChanged.subscribe(() => { changes++; });
  single.search.searchTerm = beta.label;
  single.component.onOptionSelected(beta);
  assert.deepEqual(single.selectedServices.value, [beta]);
  assert.equal(changes, 1);
  single.submission.next();
  assert.equal(single.search.searchTerm, beta.label);
});

test('search service filters by unselected key and case-insensitive label and emits the configured option', () => {
  const component = new SearchServiceComponent();
  component.options = [alpha, beta, all];
  component.selectedOptions = [{ ...beta, label: 'Different label' }];
  const terms = [];
  component.searchTermChange.subscribe(term => terms.push(term));
  const selections = [];
  component.optionChanged.subscribe(option => selections.push(option));

  component.onSearchTermChanged('AL');
  assert.deepEqual(component.filteredOptions, [alpha, all]);
  component.onSearchTermChanged('ALP');
  assert.deepEqual(component.filteredOptions, [alpha]);
  for (const selected of [false, true]) {
    const source = /** @type {import('@angular/material/core').MatOption} */ (
      /** @type {unknown} */ ({ value: alpha.label, selected })
    );
    component.onSelectionChanged(new MatOptionSelectionChange(source));
  }
  assert.deepEqual(selections, [alpha]);
  assert.equal(selections[0], alpha);
  component.resetSearchTerm();
  assert.deepEqual(terms, ['AL', 'ALP', '']);
});
