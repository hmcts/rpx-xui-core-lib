import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import { Observable, Subject, throwError } from 'rxjs';
import { SearchVenueComponent } from '@hmcts/rpx-xui-core-lib/ui/search-venue';

const location = (epimms_id, court_name = epimms_id) => ({ epimms_id, court_name });
const make = (service = { searchLocations: () => new Observable() }) => new SearchVenueComponent(/** @type {ConstructorParameters<typeof SearchVenueComponent>[0]} */ (/** @type {unknown} */ (service)), new FormBuilder());
const inputEvent = value => /** @type {Event} */ (/** @type {unknown} */ ({ target: { value } }));

test('venue search skips short terms, forwards source parameters, cancels stale searches and excludes selected venues', () => {
  const requests = [];
  const service = { searchLocations(serviceIds, locationType, term) {
    const response = new Subject();
    const request = { serviceIds, locationType, term, response, cancelled: false };
    requests.push(request);
    return new Observable(subscriber => {
      const subscription = response.subscribe(subscriber);
      return () => { request.cancelled = true; subscription.unsubscribe(); };
    });
  } };
  const component = make(service);
  const selected = location('already-selected');
  component.selectedLocations = [selected];
  component.serviceIds = 'BBA3,BFA1';
  component.locationType = 'hearing';
  component.ngOnInit();
  component.search('ab');
  assert.deepEqual(requests, []);
  component.search('court');
  component.search('court house');
  assert.equal(requests[0].cancelled, true);
  assert.deepEqual([requests[1].serviceIds, requests[1].locationType, requests[1].term], ['BBA3,BFA1', 'hearing', 'court house']);
  const fresh = location('fresh', 'Fresh Court');
  requests[0].response.next([location('stale')]);
  requests[1].response.next([selected, fresh]);
  assert.deepEqual(component.displayedLocations, [fresh]);
  assert.equal(component.searchInProgress, false);
  component.ngOnDestroy();
  assert.equal(requests[1].cancelled, true);
});

test('venue selection keeps the source object and emits the exact source events', () => {
  const component = make();
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  const events = [];
  component.locationChanged.subscribe(value => events.push(value));
  const selected = location('court-1', 'Court One');
  component.onSelectionChange(selected);
  assert.equal(control.value, selected);
  assert.equal(events[0], selected);
  component.onKeyDown();
  assert.equal(events.length, 2);
  assert.equal(events[1], undefined);
  component.ngOnDestroy();
});

test('venue control displays the selected court name on initialization', () => {
  const selected = location('venue-1', 'Hearing Centre');
  const component = make();
  component.control = new FormControl(selected);
  component.ngOnInit();
  assert.equal(component.searchControl.value, 'Hearing Centre');
  component.ngOnDestroy();
});

test('venue input follows parent control changes after initialization', () => {
  const component = make();
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  control.setValue(location('venue-reset', 'Reset Court'));
  assert.equal(component.searchControl.value, 'Reset Court');
  control.reset();
  assert.equal(component.searchControl.value, '');
  component.ngOnDestroy();
});

test('venue selection appends the EPIMMS ID to an existing FormArray', () => {
  const component = make();
  const control = new FormArray([]);
  component.control = control;
  component.ngOnInit();
  component.onSelectionChange(location('court-2'));
  assert.equal(control.length, 1);
  assert.equal(control.at(0).value, 'court-2');
  component.ngOnDestroy();
});

test('venue request failures use the legacy empty state and later searches recover', () => {
  const service = { searchLocations(_serviceIds, _locationType, term) {
    return term === 'broken' ? throwError(() => new Error('synthetic failure')) : new Observable(subscriber => subscriber.next([location('recovered', 'Recovered Court')]));
  } };
  const component = make(service);
  component.ngOnInit();
  component.search('broken');
  assert.deepEqual(component.displayedLocations, []);
  assert.equal(component.searchInProgress, false);
  component.search('recover');
  assert.deepEqual(component.displayedLocations, [location('recovered', 'Recovered Court')]);
  component.ngOnDestroy();
});

test('an exact venue-name result is selected and emitted automatically', () => {
  const selected = location('venue-exact', 'Central Hearing Centre');
  const component = make({ searchLocations: () => new Observable(subscriber => subscriber.next([selected])) });
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  const events = [];
  component.locationChanged.subscribe(value => events.push(value));
  component.search('Central Hearing Centre');
  assert.equal(control.value, selected);
  assert.deepEqual(component.displayedLocations, []);
  assert.deepEqual(events, [selected]);
  component.ngOnDestroy();
});

test('an exact venue match appends its EPIMMS ID when the selected control is a FormArray', () => {
  const selected = location('venue-array', 'Array Venue');
  const component = make({ searchLocations: () => new Observable(subscriber => subscriber.next([selected])) });
  const control = new FormArray([]);
  component.control = control;
  component.ngOnInit();
  component.search('Array Venue');
  assert.equal(control.length, 1);
  assert.equal(control.at(0).value, 'venue-array');
  assert.equal(component.searchControl.value, 'Array Venue');
  component.ngOnDestroy();
});

test('duplicate exact venue names remain available for explicit selection', () => {
  const matches = [location('venue-one', 'Shared Venue'), location('venue-two', 'Shared Venue')];
  const component = make({ searchLocations: () => new Observable(subscriber => subscriber.next(matches)) });
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  const events = [];
  component.locationChanged.subscribe(value => events.push(value));
  component.search('Shared Venue');
  assert.equal(control.value, null);
  assert.deepEqual(component.displayedLocations, matches);
  assert.deepEqual(events, []);
  component.ngOnDestroy();
});

test('new raw venue input cancels before debounce and destruction prevents its pending search', async () => {
  const requests = [];
  const service = { searchLocations(_serviceIds, _locationType, term) {
    const response = new Subject();
    const request = { term, response, cancelled: false };
    requests.push(request);
    return new Observable(subscriber => {
      const subscription = response.subscribe(subscriber);
      return () => { request.cancelled = true; subscription.unsubscribe(); };
    });
  } };
  const component = make(service);
  component.ngOnInit();
  component.search('first');
  component.onKeyUp(inputEvent('second'));
  assert.equal(requests[0].cancelled, true);
  assert.equal(requests.length, 1);
  component.ngOnDestroy();
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(requests.length, 1);
});
