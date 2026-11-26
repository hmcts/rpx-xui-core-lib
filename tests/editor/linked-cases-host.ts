import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { ReadLinkedCasesFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/read-linked-cases-field.component';
import { LinkedCasesFromTableComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/linked-cases-table/linked-cases-from-table.component';
import { LinkedCasesToTableComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/linked-cases-table/linked-cases-to-table.component';
import { LinkedCasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/services';
import { CasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/cases.service';
import { CommonDataService } from '../../projects/core-lib/case/editor-source/lib/shared/services/common-data-service/common-data-service';
import { BeforeYouStartComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/before-you-start/before-you-start.component';
import { NoLinkedCasesComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/no-linked-cases/no-linked-cases.component';
import { MultipageComponentStateService } from '../../projects/core-lib/case/editor-source/lib/shared/services/journey/multipage-component-state.service';

@Pipe({ name: 'ccdCaseReference', standalone: false })
class CaseReferenceStub implements PipeTransform {
  transform(value: string): string { return value; }
}

@Pipe({ name: 'ccdLinkCasesReasonValue', standalone: false })
class LinkReasonStub implements PipeTransform {
  transform(value: unknown): string { return String(value); }
}

@Pipe({ name: 'ccdLinkCasesFromReasonValue', standalone: false })
class LinkFromReasonStub implements PipeTransform {
  transform(value: unknown): string { return String(value); }
}

let fixture: ReturnType<typeof TestBed.createComponent<ReadLinkedCasesFieldComponent>>;
let navigation: unknown[][] = [];
let backNavigationFixture: ComponentFixture<BeforeYouStartComponent> | ComponentFixture<NoLinkedCasesComponent>;
let backNavigation: unknown[][] = [];

export async function createLinkedCasesHost(failing: 'to' | 'from' | 'both') {
  TestBed.resetTestingModule();
  navigation = [];
  const caseField = {
    id: 'caseLinks',
    value: [{ id: 'CASE-456', value: { CaseReference: 'CASE-456', ReasonForLink: [] as unknown[] } }]
  };
  const caseDetails = {
    case_id: 'CASE-123',
    case_type: { id: 'civil', name: 'civil', description: 'Civil', jurisdiction: { id: 'family', description: 'Family' } },
    state: { name: 'Open', description: 'Open' },
    tabs: [{ fields: [caseField] }]
  };
  const linkedCases = {
    caseDetails: { case_type: 'civil', case_id: 'CASE-123' },
    serverJurisdictionError: failing === 'both',
    isServerReasonCodeError: false,
    mapLookupIDToValueFromJurisdictions: (_field: string, value: string) => value,
    getCaseName: () => 'Linked case'
  };
  const casesService = {
    getCaseViewV2: () => failing === 'to' || failing === 'both'
      ? throwError(() => new Error('linked-to unavailable'))
      : of({
        case_id: 'CASE-456',
        case_type: { id: 'civil', name: 'civil', description: 'Civil', jurisdiction: { id: 'family', description: 'Family' } },
        state: { name: 'Open', description: 'Open' }
      }),
    getLinkedCases: () => failing === 'from' || failing === 'both'
      ? throwError(() => new Error('linked-from unavailable'))
      : of({ linkedCases: [] })
  };

  await TestBed.configureTestingModule({
    imports: [CommonModule],
    declarations: [
      ReadLinkedCasesFieldComponent,
      LinkedCasesToTableComponent,
      LinkedCasesFromTableComponent,
      CaseReferenceStub,
      LinkReasonStub,
      LinkFromReasonStub
    ],
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: { case: caseDetails } } } },
      { provide: Router, useValue: { navigate: (commands: unknown[], extras: unknown) => { navigation.push([commands, extras]); return Promise.resolve(true); } } },
      { provide: LinkedCasesService, useValue: linkedCases },
      { provide: CasesService, useValue: casesService },
      { provide: AbstractAppConfig, useValue: { getRDCommonDataApiUrl: () => '/refdata' } },
      { provide: CommonDataService, useValue: {
        getRefData: () => failing === 'both'
          ? throwError(() => new Error('reason codes unavailable'))
          : of({ list_of_values: [] })
      } }
    ]
  }).compileComponents();

  fixture = TestBed.createComponent(ReadLinkedCasesFieldComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
}

export function readLinkedCasesState() {
  const root = fixture.nativeElement as HTMLElement;
  const sections = Array.from(root.firstElementChild?.children ?? []) as HTMLElement[];
  const error = 'Some case information is not available at the moment';
  const combinedError = 'There has been a system error and your request could not be processed.';
  const toSection = sections.find(section => section.querySelector('ccd-linked-cases-to-table'));
  const fromSection = sections.find(section => section.querySelector('ccd-linked-cases-from-table'));
  return {
    retryLinks: Array.from(root.querySelectorAll<HTMLAnchorElement>('a.govuk-link'), link => link.textContent.trim()),
    toFailure: toSection?.textContent.includes(error),
    fromFailure: fromSection?.textContent.includes(error),
    combinedFailures: sections.filter(section => section.textContent.includes(combinedError)).length,
    navigation,
    toRows: root.querySelector('table[aria-label="table to display cases linked TO"] tbody')?.textContent.trim(),
    fromRows: root.querySelector('table[aria-label="table to display cases linked from"] tbody')?.textContent.trim()
  };
}

export function reloadLinkedCases() {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.govuk-link')?.click();
  return navigation;
}

export async function createLinkedCasesBackHost(target: 'before-you-start' | 'no-linked-cases') {
  TestBed.resetTestingModule();
  backNavigation = [];
  const linkedCases = {
    caseDetails: {
      case_id: 'CASE-123',
      case_type: { id: 'civil', name: 'civil', description: 'Civil', jurisdiction: { id: 'family', description: 'Family' } }
    },
    caseId: 'CASE-123',
    isLinkedCasesEventTrigger: false,
    serverLinkedApiError: { id: 'linked-cases-error', message: 'Linked cases are unavailable' },
    caseFieldValue: [] as unknown[],
    initialCaseLinks: [] as unknown[],
    casesToUnlink: [] as unknown[],
    linkedCases: [] as unknown[],
    hasContinuedFromStart: false
  };

  await TestBed.configureTestingModule({
    imports: [CommonModule],
    declarations: [BeforeYouStartComponent, NoLinkedCasesComponent],
    providers: [
      { provide: Router, useValue: { navigate: (commands: unknown[], extras: unknown) => { backNavigation.push([commands, extras]); return Promise.resolve(true); } } },
      { provide: LinkedCasesService, useValue: linkedCases },
      MultipageComponentStateService
    ]
  }).compileComponents();

  if (target === 'before-you-start') {
    backNavigationFixture = TestBed.createComponent(BeforeYouStartComponent);
  } else {
    backNavigationFixture = TestBed.createComponent(NoLinkedCasesComponent);
  }
  document.body.appendChild(backNavigationFixture.nativeElement);
  backNavigationFixture.detectChanges();
}

export function readLinkedCasesBackNavigation() {
  return backNavigation;
}
