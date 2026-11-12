import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Observable, of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BookingCheckType, LocationService } from '@hmcts/rpx-xui-core-lib/reference/locations';
import { RefDataService } from '@hmcts/rpx-xui-core-lib/reference/ref-data';
import { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';
import { SearchLocationComponent } from '@hmcts/rpx-xui-core-lib/ui/search-location';

const sleep = () => new Promise(resolve => setTimeout(resolve, 340));
const create = (locations, ref = { getLocationsByServiceCodes: () => of([]) }, storage = {getItem: () => null}) => {
  const injector = Injector.create({providers:[{provide:LocationService,useValue:locations}, {provide:SessionStorageService,useValue:storage}, {provide:RefDataService,useValue:ref}]});
  return new SearchLocationComponent(injector.get(LocationService), injector.get(SessionStorageService), injector.get(RefDataService));
};
const key = value => {
  const event = new Event('keydown', {cancelable:true});
  Object.defineProperty(event, 'key', {value});
  return /** @type {KeyboardEvent} */ (/** @type {unknown} */ (event));
};

test('search requires three characters and cancels previous in-flight request', async () => {
  const requests = []; const cancelled = []; const subscribers = []; const observed = [];
  const component = create({getAllLocations: (_url, _services, _type, term) => new Observable(subscriber => {requests.push(term); subscribers.push(subscriber); return () => cancelled.push(term);})});
  component.ngOnInit(); const subscription = component.filteredList$.subscribe(value => observed.push(value));
  component.searchTermFormControl.setValue('ab'); await sleep(); assert.deepEqual(requests, []);
  component.searchTermFormControl.setValue('abc'); await sleep(); assert.deepEqual(requests, ['abc']);
  component.searchTermFormControl.setValue('abcd'); await sleep(); assert.deepEqual(requests, ['abc', 'abcd']); assert.deepEqual(cancelled, ['abc']);
  subscribers[0].next([{site_name:'Stale',epimms_id:'stale'}]);
  subscribers[1].next([{site_name:'Fresh',epimms_id:'fresh'}]);
  assert.deepEqual(observed, [null, [{site_name:'Fresh',epimms_id:'fresh'}]]);
  subscription.unsubscribe(); assert.deepEqual(cancelled, ['abc', 'abcd']);
});

test('lookup failure emits null and selection retains object identity', async () => {
  const component = create({getAllLocations: () => throwError(() => new Error('synthetic'))});
  component.ngOnInit(); const values = []; const sub = component.filteredList$.subscribe(v => values.push(v));
  component.searchTermFormControl.setValue('abc'); await sleep(); assert.deepEqual(values, [null]); sub.unsubscribe();
  const location = {site_name:'Synthetic', epimms_id:'1'}; let selected; component.locationSelected.subscribe(value => {selected = value;});
  component.onSelectedLocation(location); assert.equal(selected, location); assert.equal(component.searchTermFormControl.value, 'Synthetic');
});

test('keyboard validation preserves supported navigation and rejects numeric input', () => {
  const component = create({});
  assert.equal(component.isCharacterValid(key('a')), true); assert.equal(component.isCharacterValid(key('ArrowLeft')), true);
  const invalid = key('3'); component.removeInvalidString(invalid); assert.equal(invalid.defaultPrevented, true);
});

test('service-code filtering excludes selected and duplicate locations', () => {
  const results = [
    {site_name:'Synthetic Court', epimms_id:'1'}, {site_name:'Synthetic Court', epimms_id:'2'},
    {site_name:'Other Court', epimms_id:'3'}, {site_name:'Synthetic Tribunal', epimms_id:'4'},
  ];
  let codes; const component = create({}, {getLocationsByServiceCodes(value) {codes = value; return of(results);}});
  component.field = {name:'location',options:[],minSelected:0,maxSelected:1,type:'find-location',servicesField:'services'};
  component.form = new FormGroup({services:new FormControl([{key:'A'}, {key:'B'}])});
  component.selectedLocations = [results[3]]; component.ngOnInit();
  const received = []; const subscription = component.filteredList$.subscribe(value => received.push(value));
  component.searchTermFormControl.setValue('synthetic');
  assert.deepEqual(codes, ['A','B']); assert.deepEqual(received, [[results[0]]]); subscription.unsubscribe();
});

test('reset and booking session inputs retain source behavior', () => {
  let observed; const contents = {bookableServices:'["A","B"]', bookableUserLocations:'[{"service":"A","locations":[]}]'};
  const component = create({getAllLocations(...args) {observed = args; return of([]);}}, {getLocationsByServiceCodes: () => of([])}, {getItem: key => contents[key]});
  component.bookingCheck = BookingCheckType.POSSIBLE_BOOKINGS; component.locationType = 'hearing'; component.getLocations('court').subscribe();
  assert.deepEqual(observed, ['api/locations/getLocations',['A','B'],'hearing','court',[{service:'A',locations:[]}]]);
  component.searchTermFormControl.setValue('old'); component.reset = true; assert.equal(component.searchTermFormControl.value, '');
});

test('constructor uses the supplied location and session instances without copying', () => {
  let calls = 0; let seen;
  const storage = {getItem(key) {assert.equal(key, 'userLocations'); return '[{"service":"A","locations":[]}]';}};
  const location = {getAllLocations(_url, _service, _type, _term, userLocations) {calls++; seen = userLocations; return of([]);}};
  const component = create(location, {getLocationsByServiceCodes: () => of([])}, storage);
  component.bookingCheck = BookingCheckType.BOOKINGS_AND_BASE; component.getLocations('court').subscribe();
  assert.equal(calls, 1); assert.deepEqual(seen, [{service:'A',locations:[]}]);
});

test('input change emits both source events with the entered term', async () => {
  const component = create({getAllLocations: () => of([])});
  const terms = []; let changes = 0;
  component.locationTermSearchInputChanged.subscribe(value => terms.push(value));
  component.searchLocationChanged.subscribe(() => changes++);
  component.ngOnInit(); const subscription = component.filteredList$.subscribe();
  component.searchTermFormControl.setValue('court'); component.onInput(); await sleep();
  assert.deepEqual(terms, ['court']); assert.equal(changes, 1); subscription.unsubscribe();
});

test('lookup uses configured arguments and excludes previously selected locations', async () => {
  const existing = {site_name:'Court One',epimms_id:'1'}; const available = {site_name:'Court Two',epimms_id:'2'};
  let args; const component = create({getAllLocations(...value) {args=value; return of([existing, available]);}});
  component.serviceIds='A,B'; component.locationType='hearing'; component.bookingCheck=BookingCheckType.NO_CHECK;
  component.selectedLocations=[existing]; component.ngOnInit(); const values=[]; const sub=component.filteredList$.subscribe(value => values.push(value));
  component.searchTermFormControl.setValue('court'); await sleep();
  assert.deepEqual(args,['api/locations/getLocations','A,B','hearing','court',undefined]); assert.deepEqual(values,[[available]]); sub.unsubscribe();
});

test('service lookup handles empty search and filters by configured property', () => {
  let subscriptions=0; const location = {site_name:'Synthetic Site',venue_name:'Tribunal',epimms_id:'1'};
  const component = create({}, {getLocationsByServiceCodes() {return new Observable(subscriber => {subscriptions++; subscriber.next([location]); subscriber.complete();});}});
  component.field={name:'location',options:[],minSelected:0,maxSelected:1,type:'find-location',servicesField:'services'};
  component.form=new FormGroup({services:new FormControl([{key:'A'}])}); component.propertyNameFilter='venue_name'; component.ngOnInit();
  const values=[]; const sub=component.filteredList$.subscribe(value => values.push(value));
  component.searchTermFormControl.setValue(''); assert.equal(subscriptions,0); assert.deepEqual(values,[null]);
  component.searchTermFormControl.setValue('trib'); assert.equal(subscriptions,1); assert.deepEqual(values,[null,[location]]); sub.unsubscribe();
});

test('keyboard input preserves legacy accepted keys and legacy keyCode fallback', () => {
  const component=create({});
  for (const value of ['A','z',' ',"'",'-','Tab','ArrowLeft','ArrowRight','Backspace','Enter']) assert.equal(component.isCharacterValid(key(value)),true);
  for (const value of ['1','@','Escape','Delete']) assert.equal(component.isCharacterValid(key(value)),false);
  const legacy = key(undefined); Object.defineProperty(legacy,'keyCode',{value:65}); assert.equal(component.isCharacterValid(legacy),true);
  const valid=key('A'); component.removeInvalidString(valid); assert.equal(valid.defaultPrevented,false);
});
