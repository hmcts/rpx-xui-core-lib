import { JsonPipe } from '@angular/common';
import { Component, importProvidersFrom, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { BookingCheckType, LocationService, type LocationByEPIMMSModel, type LocationsByService } from '@hmcts/rpx-xui-core-lib/reference/locations';
import { RefDataService } from '@hmcts/rpx-xui-core-lib/reference/ref-data';
import { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';
import { FindLocationModule } from '@hmcts/rpx-xui-core-lib/ui/find-location';
import { FindServiceModule } from '@hmcts/rpx-xui-core-lib/ui/find-service';
import { type FilterConfigOption, type FilterFieldConfig } from '@hmcts/rpx-xui-core-lib/ui/search-location';
import { SearchServiceModule } from '@hmcts/rpx-xui-core-lib/ui/search-service';
import { defer, of, Subject } from 'rxjs';

const alpha = { key: 'A', label: 'Alpha service' };
const beta = { key: 'B', label: 'Beta service' };
const gamma = { key: 'C', label: 'Gamma service' };
const all = { key: 'All', label: 'All', selectAll: true };
const locations: LocationByEPIMMSModel[] = ['Alpha', 'Beta', 'Gamma'].map((name, index) => ({
  epimms_id: String(index + 1), site_name: `Court ${name}`, venue_name: `Venue ${name}`,
}));
const bookingLocations: LocationsByService[] = [{ service: 'A', locations: [] }];
const locationLookup = signal<{
  url: string; serviceIds: string; type: string; term: string; booking?: LocationsByService[];
} | null>(null);
const referenceCodes = signal<string[]>([]);

@Component({
  selector: 'core-test-host',
  imports: [JsonPipe, FindLocationModule, FindServiceModule, SearchServiceModule],
  template: `
    <main>
      <h1>Filter renderers</h1>
      @switch (mode) {
        @case ('search') {
          <label for="inputServiceSearch">Search services</label>
          <exui-search-service #search
            [options]="services" [selectedOptions]="selectedServices" [disabled]="searchDisabled"
            [showAutocomplete]="showEmptyResult" [(searchTerm)]="searchTerm"
            (searchTermChange)="termEvents.push($event)" (optionChanged)="selectService($event)">
          </exui-search-service>
          <button type="button" (click)="searchDisabled = true">True</button>
          <button type="button" (click)="searchDisabled = false">False</button>
          <button type="button" (click)="searchDisabled = null">Null</button>
          <button type="button" (click)="useUndefinedDisabled()">Undefined</button>
          <button type="button" (click)="showEmptyResult = true">Show empty result</button>
          <button type="button" (click)="search.resetSearchTerm()">Reset search</button>
          <p data-testid="term">{{ searchTerm }}</p>
          <pre data-testid="term-events">{{ termEvents | json }}</pre>
          <pre data-testid="selection">{{ selection | json }}</pre>
          <p data-testid="selection-count">{{ selectionCount }}</p>
        }
        @case ('service') {
          <xuilib-find-service [form]="form" [field]="serviceField" [disabled]="nativeDisabled"
            serviceTitle="Search for a service" [formSubmissionEvent$]="submission"
            (serviceFieldChanged)="serviceEvents = serviceEvents + 1">
          </xuilib-find-service>
          <pre data-testid="service-form">{{ form.controls.services.value | json }}</pre>
          <p data-testid="service-events">{{ serviceEvents }}</p>
        }
        @default {
          <xuilib-find-location [form]="form" [field]="locationField" [fields]="fields" [services]="locationServices"
            [disabled]="locationReset" [disableInputField]="nativeDisabled" locationTitle="Find a work location"
            [enableAddLocationButton]="!single" [formSubmissionEvent$]="submission"
            (locationFieldChanged)="locationEvents = locationEvents + 1">
          </xuilib-find-location>
          <button type="button" (click)="locationReset = !locationReset">Toggle location reset</button>
          <button type="button" (click)="locationServices = [true, true, true]">Use checkbox services</button>
          <pre data-testid="location-form">{{ form.controls.locations.value | json }}</pre>
          <pre data-testid="location-lookup">{{ locationLookup() | json }}</pre>
          <pre data-testid="reference-codes">{{ referenceCodes() | json }}</pre>
          <p data-testid="location-events">{{ locationEvents }}</p>
        }
      }
      @if (mode !== 'search') {
        <button type="button" (click)="nativeDisabled = !nativeDisabled">Toggle native disabled</button>
        <button type="button" (click)="submission.next()">Submit form</button>
      }
    </main>
  `
})
class FilterRenderersGallery {
  private readonly params = new URLSearchParams(window.location.search);
  readonly mode = this.params.get('mode');
  readonly single = this.params.has('single');
  readonly services = [alpha, beta, gamma];
  readonly selectedServices = [{ ...beta, label: 'Previously selected beta service' }];
  readonly submission = new Subject<void>();
  readonly termEvents: string[] = [];
  readonly locationLookup = locationLookup;
  readonly referenceCodes = referenceCodes;
  readonly form = new FormGroup({
    locations: new FormArray<FormControl<LocationByEPIMMSModel | null>>([]),
    services: new FormArray<FormControl<FilterConfigOption | null>>(
      this.mode === 'staff' ? [new FormControl(alpha), new FormControl(beta)] : []
    ),
  });
  readonly fields: FilterFieldConfig[] = [{
    name: 'workServices', type: 'checkbox', minSelected: 0, maxSelected: 2,
    options: [{ key: 'services_all', label: 'All services' }, alpha, beta],
  }];
  readonly serviceField: FilterFieldConfig = {
    name: 'services', type: 'find-service', minSelected: 0, maxSelected: this.single ? 1 : 3,
    enableAddButton: !this.single, options: [beta, all, alpha],
  };
  readonly locationField: FilterFieldConfig = {
    name: 'locations', type: 'find-location', minSelected: 0, maxSelected: this.single ? 1 : 3, options: [],
    ...(this.mode === 'staff'
      ? { servicesField: 'services', propertyNameFilter: 'venue_name' }
      : { findLocationField: 'workServices', bookingCheckType: BookingCheckType.BOOKINGS_AND_BASE }),
  };

  searchDisabled: boolean | null | undefined = true;
  nativeDisabled = false;
  locationReset = this.mode === 'work';
  showEmptyResult = false;
  searchTerm = 'Initial service search';
  locationServices: string | boolean[] = 'A';
  selection: FilterConfigOption | null = null;
  selectionCount = 0;
  serviceEvents = 0;
  locationEvents = 0;

  selectService(option: FilterConfigOption): void {
    this.selection = option;
    this.selectionCount++;
  }

  useUndefinedDisabled(): void {
    this.searchDisabled = undefined;
  }
}

export function startFilterRenderersGallery() {
  return bootstrapApplication(FilterRenderersGallery, { providers: [
    importProvidersFrom(RpxTranslationModule.forRoot({
      baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false,
    })),
    { provide: LocationService, useValue: {
      getAllLocations(url: string, serviceIds: string, type: string, term: string, booking?: LocationsByService[]) {
        return defer(() => {
          locationLookup.set({ url, serviceIds, type, term, booking });
          return of(locations.filter(location => location.site_name?.toLowerCase().includes(term.toLowerCase())));
        });
      },
    } },
    { provide: RefDataService, useValue: {
      getLocationsByServiceCodes(codes: string[]) {
        referenceCodes.set(codes);
        return of(locations);
      },
    } },
    { provide: SessionStorageService, useValue: {
      getItem: (key: string) => key === 'userLocations' ? JSON.stringify(bookingLocations) : null,
    } },
  ] });
}
