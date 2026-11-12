import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { of } from 'rxjs';
import { SearchLocationModule } from '@hmcts/rpx-xui-core-lib/ui/search-location';
import { LocationService, LocationByEPIMMSModel } from '@hmcts/rpx-xui-core-lib/reference/locations';
import { RefDataService } from '@hmcts/rpx-xui-core-lib/reference/ref-data';
import { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';

@Component({ selector:'core-search-location-host', imports:[SearchLocationModule], template:`<main><h1>Location search</h1>@if (label) { <label for="inputLocationSearch">Find a location</label> }<exui-search-location [singleMode]="true" (locationSelected)="selected=$event.site_name ?? ''"></exui-search-location><p data-testid="selected">{{selected}}</p></main>` })
class SearchGallery { selected = ''; label = new URLSearchParams(window.location.search).has('label'); }
export function startSearchLocationGallery() {
  return bootstrapApplication(SearchGallery, {providers:[
    importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations', debounceTimeMs:20, validity:{days:1}, testMode:false})),
    {provide:LocationService,useValue:{getAllLocations: () => of([{site_name:'Synthetic Court', epimms_id:'1'}] satisfies Partial<LocationByEPIMMSModel>[])}},
    {provide:RefDataService,useValue:{}}, {provide:SessionStorageService,useValue:{getItem: () => null}}
  ]});
}
