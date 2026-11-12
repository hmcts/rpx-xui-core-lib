import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, InjectionToken } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom, EmptyError } from 'rxjs';
import { RefDataDataAccessService, RefDataService } from '@hmcts/rpx-xui-core-lib/reference/ref-data';

function setup(t) {
 const injector=Injector.create({providers:[provideHttpClientTesting(),{provide:HttpClient,useFactory:backend=>new HttpClient(backend),deps:[HttpBackend]},RefDataDataAccessService,RefDataService]});
 const http=injector.get(HttpTestingController);t.after(()=>{http.verify();injector.destroy()});return {injector,http,access:injector.get(RefDataDataAccessService),service:injector.get(RefDataService)};
}

test('reference data HTTP endpoints and encoded service-code parameter match the source', async t=>{
 const {http,access}=setup(t);
 /** @type {Array<{stream: import('rxjs').Observable<unknown>, url: string}>} */
 const endpoints = [{stream:access.getServices(),url:'/api/ref-data/services'},{stream:access.getRegions(),url:'/api/ref-data/regions'},{stream:access.getLocations(),url:'/api/ref-data/locations'}];
 for(const {stream,url} of endpoints){
  const pending=firstValueFrom(stream);const request=http.expectOne(url);assert.equal(request.request.method,'GET');request.flush([]);assert.deepEqual(await pending,[]);
 }
 const pending=firstValueFrom(access.getLocationsByServiceCode('A&B'));const request=http.expectOne('/api/ref-data/locations-by-service-code?service_code=A%26B');assert.equal(request.request.method,'GET');request.flush({court_venues:[]});assert.deepEqual(await pending,{court_venues:[]});
});

test('reference data shares duplicate codes, retains input order and reuses successful cache', async t=>{
 const {http,service}=setup(t);const pending=firstValueFrom(service.getLocationsByServiceCodes(['A','A','B']));
 const a=http.expectOne('/api/ref-data/locations-by-service-code?service_code=A');const b=http.expectOne('/api/ref-data/locations-by-service-code?service_code=B');
 b.flush({court_venues:[{epimms_id:'2'}]});a.flush({court_venues:[{epimms_id:'1'}]});assert.deepEqual(await pending,[{epimms_id:'1'},{epimms_id:'1'},{epimms_id:'2'}]);
 assert.deepEqual(await firstValueFrom(service.getLocationsByServiceCodes(['A'])),[{epimms_id:'1'}]);http.expectNone('/api/ref-data/locations-by-service-code?service_code=A');
});

test('reference data service-code errors cache the empty fallback without retry', async t=>{
 const {http,service}=setup(t);const pending=firstValueFrom(service.getLocationsByServiceCodes(['A']));
 http.expectOne('/api/ref-data/locations-by-service-code?service_code=A').flush('offline',{status:503,statusText:'Unavailable'});assert.deepEqual(await pending,[]);
 assert.deepEqual(await firstValueFrom(service.getLocationsByServiceCodes(['A'])),[]);http.expectNone('/api/ref-data/locations-by-service-code?service_code=A');
});

test('reference data direct region stream propagates errors and retries on a later subscription', async t=>{
 const {http,service}=setup(t);const pending=firstValueFrom(service.regions$);const rejected=assert.rejects(pending,error=>error instanceof HttpErrorResponse && error.status===503);
 http.expectOne('/api/ref-data/regions').flush('offline',{status:503,statusText:'Unavailable'});await rejected;
 const retry=firstValueFrom(service.regions$);http.expectOne('/api/ref-data/regions').flush([{region_id:'1',description:'Synthetic'}]);assert.deepEqual(await retry,[{region_id:'1',description:'Synthetic'}]);
});

test('reference data empty service codes complete without emitting or making a request', async t=>{
 const {http,service}=setup(t);await assert.rejects(firstValueFrom(service.getLocationsByServiceCodes([])),EmptyError);http.expectNone(request=>request.url.includes('locations-by-service-code'));
});

test('reference data shared request survives one consumer cancellation and populates the cache', async t=>{
 const {http,service}=setup(t);const subscription=service.getLocationsByServiceCodes(['A']).subscribe();const request=http.expectOne('/api/ref-data/locations-by-service-code?service_code=A');subscription.unsubscribe();assert.equal(request.cancelled,false);
 request.flush({court_venues:[{epimms_id:'1'}]});assert.deepEqual(await firstValueFrom(service.getLocationsByServiceCodes(['A'])),[{epimms_id:'1'}]);http.expectNone('/api/ref-data/locations-by-service-code?service_code=A');
});

test('both reference data token alias directions share one service across injector boundaries', t=>{
 const {service}=setup(t);const legacy=new InjectionToken('synthetic-legacy-ref-data');
 for(const direction of ['core-to-legacy','legacy-to-core']) {
  const providers=direction==='core-to-legacy'?[{provide:legacy,useValue:service},{provide:RefDataService,useExisting:legacy}]:[{provide:RefDataService,useValue:service},{provide:legacy,useExisting:RefDataService}];
  const root=Injector.create({providers});const child=Injector.create({parent:root,providers:[]});t.after(()=>{child.destroy();root.destroy()});
  assert.strictEqual(root.get(legacy),service);assert.strictEqual(child.get(RefDataService),service);assert.strictEqual(root.get(RefDataService),child.get(legacy));
 }
});

test('reference data shares one in-flight HTTP request across concurrent consumers', async t=>{
 const {http,service}=setup(t);const first=firstValueFrom(service.getLocationsByServiceCodes(['A']));const second=firstValueFrom(service.getLocationsByServiceCodes(['A']));
 const request=http.expectOne('/api/ref-data/locations-by-service-code?service_code=A');request.flush({court_venues:[{epimms_id:'1'}]});
 assert.deepEqual(await first,[{epimms_id:'1'}]);assert.deepEqual(await second,[{epimms_id:'1'}]);http.expectNone('/api/ref-data/locations-by-service-code?service_code=A');
});
