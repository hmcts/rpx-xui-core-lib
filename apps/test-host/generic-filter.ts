import { JsonPipe } from '@angular/common';
import { Component, importProvidersFrom, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';
import { BookingCheckType, LocationService, type LocationsByService } from '@hmcts/rpx-xui-core-lib/reference/locations';
import { RefDataService } from '@hmcts/rpx-xui-core-lib/reference/ref-data';
import { FilterService, type FilterConfig, type FilterError, type FilterFieldConfig, type FilterSetting } from '@hmcts/rpx-xui-core-lib/ui/filter-state';
import { FindAPersonService, PersonRole, type SearchOptions } from '@hmcts/rpx-xui-core-lib/ui/find-person';
import { GenericFilterComponent, GenericFilterModule } from '@hmcts/rpx-xui-core-lib/ui/generic-filter';
import { TaskService } from '@hmcts/rpx-xui-core-lib/ui/task-data';
import { defer, of } from 'rxjs';

const serviceA = { key: 'A', label: 'Alpha service' };
const serviceB = { key: 'B', label: 'Beta service' };
const all = { key: 'All', label: 'All', selectAll: true };
const workLocations = ['Alpha', 'Beta', 'Gamma'].map((name, index) => ({
  epimms_id: `work-${index + 1}`, site_name: `Court ${name}`,
}));
const staffVenue = { epimms_id: 'venue-1', site_name: 'A different site name', venue_name: 'Civic hall' };
const booking: LocationsByService[] = [{ service: 'A', locations: [] }];
const person = {
  domain: PersonRole.LEGAL_OPERATIONS, email: 'alex@example.com', id: 'person-1', name: 'Alex Example', knownAs: 'Alex',
};
const task = { task_type: { task_type_id: 'review', task_type_name: 'Review task' } };
const workType = { key: 'routine', label: 'Routine work' };
const workLookup = signal<{
  url: string; serviceIds: string; type: string; term: string; booking?: LocationsByService[];
} | null>(null);
const refCodes = signal<string[]>([]);
const personLookup = signal<SearchOptions | null>(null);
const taskService = signal<string | null>(null);

declare global {
  interface Window {
    genericFilterFixture: () => { form: Record<string, unknown>; submitted: boolean };
  }
}

function field(type: FilterFieldConfig['type'], name: string, title: string, options: Partial<FilterFieldConfig> = {}): FilterFieldConfig {
  return { name, title, type, minSelected: 0, maxSelected: 0, options: [], ...options };
}

function workFields(checkbox: boolean): FilterFieldConfig[] {
  return [
    checkbox
      ? field('checkbox', 'services', 'Services', { options: [{ ...all, key: 'services_all', label: 'All services' }, serviceA, serviceB] })
      : field('select', 'service', 'Service', { options: [serviceA, serviceB], minSelected: 1 }),
    field('radio', 'location-scope', 'Location scope', { options: [
      { key: 'location_all', label: 'All locations' }, { key: 'search', label: 'Search for a location' },
    ] }),
    field('find-location', 'location', 'Location', {
      findLocationField: checkbox ? 'services' : 'service',
      enableCondition: 'location-scope=search', radioSelectionChange: 'location-scope=search',
      locationTitle: 'Find a work location', maxSelected: checkbox ? 3 : 1, enableAddButton: checkbox,
      bookingCheckType: BookingCheckType.BOOKINGS_AND_BASE,
    }),
    ...(checkbox ? [] : [
      field('select', 'role', 'Role', { options: [{ key: PersonRole.LEGAL_OPERATIONS, label: 'Legal Ops' }] }),
      field('find-person', 'person', 'Person', { domainField: 'role', servicesField: 'service' }),
      field('find-task-name', 'task', 'Task', { servicesField: 'service' }),
      field('find-work-type', 'work-types', 'Work types', { enableAddButton: true, maxSelected: 3 }),
    ]),
  ];
}

function staffFields(): FilterFieldConfig[] {
  return [
    field('find-service', 'user-services', 'Service', {
      subTitle: 'Search for a service by name', options: [all, serviceA, serviceB], enableAddButton: true,
    }),
    field('find-location', 'user-location', 'Search by location', {
      servicesField: 'user-services', propertyNameFilter: 'venue_name', enableAddButton: true,
    }),
    field('group-select', 'user-skills', 'Skills', {
      defaultOption: all, groupOptions: [
        { group: 'a', options: [{ key: '1', label: 'Alpha skill' }] },
        { group: 'b', options: [{ key: '2', label: 'Beta skill' }] },
        { group: 'c', options: [{ key: '3', label: 'Unmatched skill' }] },
      ],
    }),
  ];
}

function validationFields(): FilterFieldConfig[] {
  return [
    field('group-title', 'validation FILTERS', ''),
    field('text-input', 'name', 'Name', {
      minSelected: 3, displayMinSelectedError: true, minSelectedError: 'Enter at least three characters',
    }),
    field('email-input', 'email', 'Email', { minSelected: 1, emailError: 'Enter an email address' }),
    field('checkbox-large', 'roles', 'Roles', {
      maxSelected: 1, displayMaxSelectedError: true, maxSelectedError: 'Select only one role',
      options: [{ key: 'caseworker', label: 'Caseworker' }, { key: 'admin', label: 'Administrator' }],
    }),
  ];
}

function setting(id: string, values: Record<string, unknown[]>): FilterSetting {
  return { id, fields: Object.entries(values).map(([name, value]) => ({ name, value })) };
}

@Component({
  selector: 'core-test-host',
  imports: [GenericFilterModule, JsonPipe],
  template: `
    <main>
      <h1>Generic filter</h1>
      @if (mode === 'staff') {
        <xuilib-generic-filter [config]="config"></xuilib-generic-filter>
      } @else {
        <xuilib-generic-filter [config]="config" [settings]="seed"></xuilib-generic-filter>
      }
      <pre data-testid="persisted">{{ persisted() | json }}</pre>
      <pre data-testid="errors">{{ errors() | json }}</pre>
      <output data-testid="apply-count">{{ applyCount() }}</output>
      <output data-testid="cancel-count">{{ cancelCount() }}</output>
      <pre data-testid="work-lookup">{{ workLookup() | json }}</pre>
      <pre data-testid="reference-codes">{{ refCodes() | json }}</pre>
      <pre data-testid="person-lookup">{{ personLookup() | json }}</pre>
      <pre data-testid="task-service">{{ taskService() | json }}</pre>
    </main>
  `,
})
class GenericFilterGallery {
  @ViewChild(GenericFilterComponent) widget!: GenericFilterComponent;
  readonly mode = new URLSearchParams(window.location.search).get('mode') ?? 'work';
  readonly config: FilterConfig;
  readonly seed: FilterSetting;
  readonly persisted = signal<FilterSetting | null>(null);
  readonly errors = signal<FilterError[] | null>(null);
  readonly applyCount = signal(0);
  readonly cancelCount = signal(0);
  readonly workLookup = workLookup;
  readonly refCodes = refCodes;
  readonly personLookup = personLookup;
  readonly taskService = taskService;

  constructor(filters: FilterService) {
    const staff = this.mode === 'staff';
    const validation = this.mode === 'validation';
    const checkbox = this.mode === 'checkbox';
    const multipleServices = this.mode === 'services';
    const id = `core-generic-filter-${this.mode}`;
    const defaults: Record<string, unknown[]> = multipleServices ? {} : staff ? { 'user-skills': ['All'] }
      : validation ? { name: ['Default name'], email: ['initial@example.com'] }
        : {
          'location-scope': ['location_all'],
          ...(checkbox ? {} : { service: ['A'], role: [PersonRole.LEGAL_OPERATIONS] }),
        };
    this.config = {
      id, fields: multipleServices ? [
        field('find-service', 'primary-service', 'Primary service', { options: [serviceA], enableAddButton: true }),
        field('find-service', 'secondary-service', 'Secondary service', { options: [serviceB], enableAddButton: true }),
      ] : staff ? staffFields() : validation ? validationFields() : workFields(checkbox),
      persistence: staff ? 'session' : validation ? 'memory' : 'local',
      applyButtonText: staff ? 'Search' : 'Apply', cancelButtonText: 'Reset to default',
      cancelSetting: setting(id, defaults), showCancelFilterButton: !staff,
      applyButtonCallback: () => this.applyCount.update(count => count + 1),
      cancelButtonCallback: () => this.cancelCount.update(count => count + 1),
    };
    this.seed = setting(id, validation ? { name: ['Seed name'], email: ['seed@example.com'] } : defaults);
    if (this.config.persistence === 'local') {
      const query = new URLSearchParams(window.location.search);
      if (query.get('identity') === 'missing') {
        window.sessionStorage.removeItem('userDetails');
      } else {
        const ownerHash = query.get('owner') === 'second' ? 'b'.repeat(64) : 'a'.repeat(64);
        window.sessionStorage.setItem('userDetails', JSON.stringify({ filterOwnerHash: ownerHash }));
      }
    }
    window.genericFilterFixture = () => ({ form: this.widget.form.value, submitted: this.widget.submitted });
    filters.getStream(id).pipe(takeUntilDestroyed()).subscribe(value => this.persisted.set(value));
    filters.givenErrors.pipe(takeUntilDestroyed()).subscribe(value => this.errors.set(value));
  }
}

export function startGenericFilterGallery() {
  return bootstrapApplication(GenericFilterGallery, { providers: [
    importProvidersFrom(RpxTranslationModule.forRoot({
      baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false,
    })),
    { provide: LocationService, useValue: {
      getAllLocations(url: string, serviceIds: string, type: string, term: string, userLocations?: LocationsByService[]) {
        return defer(() => {
          workLookup.set({ url, serviceIds, type, term, booking: userLocations });
          return of(workLocations.filter(location => location.site_name.toLowerCase().includes(term.toLowerCase())));
        });
      },
    } },
    { provide: RefDataService, useValue: {
      getLocationsByServiceCodes(codes: string[]) {
        return defer(() => {
          refCodes.set(codes);
          return of(codes.includes(serviceA.key) ? [staffVenue] : []);
        });
      },
    } },
    { provide: SessionStorageService, useValue: {
      getItem: (key: string) => key === 'userLocations' ? JSON.stringify(booking) : null,
    } },
    { provide: FindAPersonService, useValue: {
      find: () => of([]),
      findCaseworkers(options: SearchOptions) {
        personLookup.set(options);
        return of([person]);
      },
    } },
    { provide: TaskService, useValue: {
      getTaskName(service: string) {
        taskService.set(service);
        return of([task]);
      },
      searchWorkTypes(term: string) {
        return of(workType.label.toLowerCase().includes(term.toLowerCase()) ? [workType] : []);
      },
    } },
  ] });
}
