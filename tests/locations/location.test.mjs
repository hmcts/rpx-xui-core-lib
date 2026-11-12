import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { BookingCheckType, LocationService } from '@hmcts/rpx-xui-core-lib/reference/locations';

function setup(t) {
  const injector = Injector.create({providers:[provideHttpClientTesting(), {provide:HttpClient,useFactory:backend => new HttpClient(backend),deps:[HttpBackend]}, LocationService]});
  t.after(() => injector.destroy());
  const http = injector.get(HttpTestingController); t.after(() => http.verify());
  return { service: injector.get(LocationService), http };
}

test('locations POST retains caller URL, request body and response ordering', async t => {
  const { service, http }=setup(t);const userLocations=[{service:'synthetic',locations:[{epimms_id:'A'}]}];
  const pending=firstValueFrom(service.getAllLocations('/synthetic/locations','A,B','hearing','a b',userLocations));
  const request=http.expectOne('/synthetic/locations');assert.equal(request.request.method,'POST');
  assert.deepEqual(request.request.body,{serviceIds:'A,B',locationType:'hearing',searchTerm:'a b',userLocations});
  request.flush([{epimms_id:'2'},{epimms_id:'1'}]);assert.deepEqual(await pending,[{epimms_id:'2'},{epimms_id:'1'}]);
});

test('locations GET preserves source query interpolation and response', async t => {
  const { service, http }=setup(t);const pending=firstValueFrom(service.searchLocations('A,B','case_management','a b'));
  const request=http.expectOne('api/prd/location/getLocations?serviceIds=A,B&locationType=case_management&searchTerm=a b');assert.equal(request.request.method,'GET');
  request.flush([{epimms_id:'synthetic'}]);assert.deepEqual(await pending,[{epimms_id:'synthetic'}]);
});

test('locations HTTP errors reach the subscriber without a fallback', async t => {
  const { service, http }=setup(t);const pending=firstValueFrom(service.getAllLocations('/synthetic/fail','','','',[]));
  const rejected=assert.rejects(pending,error => error instanceof HttpErrorResponse && error.status===503 && error.error==='offline');
  http.expectOne('/synthetic/fail').flush('offline',{status:503,statusText:'Unavailable'});await rejected;
});

test('locations request cancellation aborts the Angular test request', t => {
  const { service, http }=setup(t);const subscription=service.searchLocations('A','hearing','x').subscribe();
  const request=http.expectOne('api/prd/location/getLocations?serviceIds=A&locationType=hearing&searchTerm=x');subscription.unsubscribe();assert.equal(request.cancelled,true);
});

test('location booking enum retains source values', () => {
  assert.deepEqual(BookingCheckType,{NO_CHECK:'NO_CHECK',BOOKINGS_AND_BASE:'BOOKINGS_AND_BASE',POSSIBLE_BOOKINGS:'POSSIBLE_BOOKINGS'});
});

test('locations GET retains raw query metacharacters from the caller', async t => {
  const { service, http }=setup(t);const pending=firstValueFrom(service.searchLocations('A&B','hearing','x&y'));
  const request=http.expectOne('api/prd/location/getLocations?serviceIds=A&B&locationType=hearing&searchTerm=x&y');request.flush([]);assert.deepEqual(await pending,[]);
});

test('locations GET errors propagate and POST cancellation aborts the request', async t => {
  const { service, http }=setup(t);const pending=firstValueFrom(service.searchLocations('A','hearing','x'));
  const rejected=assert.rejects(pending,error => error instanceof HttpErrorResponse && error.status===400);
  http.expectOne('api/prd/location/getLocations?serviceIds=A&locationType=hearing&searchTerm=x').flush('bad',{status:400,statusText:'Bad Request'});await rejected;
  const subscription=service.getAllLocations('/synthetic/cancel','','','',[]).subscribe();const request=http.expectOne('/synthetic/cancel');subscription.unsubscribe();assert.equal(request.cancelled,true);
});
