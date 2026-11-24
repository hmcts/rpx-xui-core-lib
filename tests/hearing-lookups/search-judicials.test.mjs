import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import { Observable, Subject, throwError } from 'rxjs';
import { SearchJudicialsComponent } from '@hmcts/rpx-xui-core-lib/ui/search-judicials';

const judge = (idamId, fullName = idamId) => ({ idamId, fullName, emailId: `${idamId}@example.test`, isJudge: 'Y', isMagistrate: 'N', isPanelMember: 'N', knownAs: '', personalCode: idamId, surname: fullName, title: 'Judge' });
const make = (service = { searchJudicial: () => new Observable() }) => new SearchJudicialsComponent(/** @type {ConstructorParameters<typeof SearchJudicialsComponent>[0]} */ (/** @type {unknown} */ (service)), new FormBuilder());
const inputEvent = value => /** @type {Event} */ (/** @type {unknown} */ ({ target: { value } }));

test('judicial search skips short terms, forwards service ID, cancels stale searches and excludes selected people', () => {
  const requests = [];
  const service = { searchJudicial(term, serviceId) {
    const response = new Subject();
    const request = { term, serviceId, response, cancelled: false };
    requests.push(request);
    return new Observable(subscriber => {
      const subscription = response.subscribe(subscriber);
      return () => { request.cancelled = true; subscription.unsubscribe(); };
    });
  } };
  const component = make(service);
  const selected = judge('already-selected');
  component.selectedJudicials = [selected];
  component.serviceId = 'SYNTHETIC';
  component.ngOnInit();
  component.search('al');
  assert.deepEqual(requests, []);
  component.search('alex');
  component.search('alex j');
  assert.equal(requests[0].cancelled, true);
  assert.equal(requests[1].term, 'alex j');
  assert.equal(requests[1].serviceId, 'SYNTHETIC');
  const fresh = judge('fresh', 'Alex Judge');
  requests[0].response.next([judge('stale')]);
  requests[1].response.next([selected, fresh]);
  assert.deepEqual(component.displayedJudicials, [fresh]);
  assert.equal(component.searchInProgress, false);
  component.ngOnDestroy();
  assert.equal(requests[1].cancelled, true);
});

test('judicial selection keeps the source object and emits the exact source events', () => {
  const component = make();
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  const events = [];
  component.judicialChanged.subscribe(value => events.push(value));
  const selected = judge('selected', 'Selected Judge');
  component.onSelectionChange(selected);
  assert.equal(control.value, selected);
  assert.equal(events[0], selected);
  component.onKeyDown();
  assert.equal(events.length, 2);
  assert.equal(events[1], undefined);
  component.ngOnDestroy();
});

test('judicial control displays the selected model using the source formatted label', () => {
  const selected = judge('selected', 'Selected Judge');
  const component = make();
  component.control = new FormControl(selected);
  component.ngOnInit();
  assert.equal(component.searchControl.value, 'Selected Judge (selected@example.test)');
  component.ngOnDestroy();
});

test('judicial input follows parent control changes after initialization', () => {
  const component = make();
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  control.setValue(judge('judge-reset', 'Reset Judge'));
  assert.equal(component.searchControl.value, 'Reset Judge (judge-reset@example.test)');
  control.reset();
  assert.equal(component.searchControl.value, '');
  component.ngOnDestroy();
});

test('judicial selection appends the IDAM ID to an existing FormArray', () => {
  const component = make();
  const control = new FormArray([]);
  component.control = control;
  component.ngOnInit();
  const selected = judge('judge-2');
  component.onSelectionChange(selected);
  assert.equal(control.length, 1);
  assert.equal(control.at(0).value, 'judge-2');
  component.ngOnDestroy();
});

test('judicial request failures use the legacy empty state and later searches recover', () => {
  const service = { searchJudicial(term) {
    return term === 'broken' ? throwError(() => new Error('synthetic failure')) : new Observable(subscriber => subscriber.next([judge('recovered', 'Recovered Judge')]));
  } };
  const component = make(service);
  component.ngOnInit();
  component.search('broken');
  assert.deepEqual(component.displayedJudicials, []);
  assert.equal(component.searchInProgress, false);
  component.search('recover');
  assert.deepEqual(component.displayedJudicials, [judge('recovered', 'Recovered Judge')]);
  component.ngOnDestroy();
});

test('an exact judicial full-name result is selected and emitted automatically', () => {
  const selected = judge('judge-exact', 'Alex Judge');
  const component = make({ searchJudicial: () => new Observable(subscriber => subscriber.next([selected])) });
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  const events = [];
  component.judicialChanged.subscribe(value => events.push(value));
  component.search('Alex Judge');
  assert.equal(control.value, selected);
  assert.equal(component.searchControl.value, 'Alex Judge (judge-exact@example.test)');
  assert.deepEqual(component.displayedJudicials, []);
  assert.equal(component.showAutocomplete, false);
  assert.deepEqual(events, [selected]);
  component.ngOnDestroy();
});

test('an exact judicial match appends its IDAM ID when the selected control is a FormArray', () => {
  const selected = judge('judge-array', 'Array Judge');
  const component = make({ searchJudicial: () => new Observable(subscriber => subscriber.next([selected])) });
  const control = new FormArray([]);
  component.control = control;
  component.ngOnInit();
  component.search('Array Judge');
  assert.equal(control.length, 1);
  assert.equal(control.at(0).value, 'judge-array');
  assert.equal(component.searchControl.value, 'Array Judge (judge-array@example.test)');
  component.ngOnDestroy();
});

test('duplicate exact judicial names remain available for explicit selection', () => {
  const matches = [judge('judge-one', 'Shared Judge'), judge('judge-two', 'Shared Judge')];
  const component = make({ searchJudicial: () => new Observable(subscriber => subscriber.next(matches)) });
  const control = new FormControl(null);
  component.control = control;
  component.ngOnInit();
  const events = [];
  component.judicialChanged.subscribe(value => events.push(value));
  component.search('Shared Judge');
  assert.equal(control.value, null);
  assert.deepEqual(component.displayedJudicials, matches);
  assert.deepEqual(events, []);
  component.ngOnDestroy();
});

test('new raw judicial input cancels before debounce and destruction prevents its pending search', async () => {
  const requests = [];
  const service = { searchJudicial(term) {
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
