import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { CaseListModule, TableConfig } from '@hmcts/rpx-xui-core-lib/ui/case-list';

interface CaseRow {
  case_id: string;
  reference: string;
  name: string;
  created: string;
}

@Component({
  selector: 'core-test-host',
  imports: [CaseListModule],
  template: `<main>
    <h1>Case list diagnostic</h1>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <ccd-case-list [caption]="'Primary cases'" [cases]="cases" [tableConfig]="tableConfig"
      [selectionEnabled]="true" [selectedCases]="selected" [currentPageNo]="page"
      [totalResultsCount]="cases.length" [pageSize]="2"
      (selection)="selected = $event" (pageChange)="page = $event"></ccd-case-list>
    <output data-testid="page">{{page}}</output>
    <output data-testid="selected-count">{{selected.length}}</output>
    <output data-testid="secondary-selected-count">{{secondarySelected.length}}</output>
    <ccd-case-list [caption]="'Secondary cases'" [cases]="secondaryCases" [tableConfig]="tableConfig"
      [selectionEnabled]="true" [selectedCases]="secondarySelected"
      (selection)="secondarySelected = $event"></ccd-case-list>
    <ccd-case-list [caption]="'Empty cases'" [cases]="emptyCases" [tableConfig]="tableConfig"
      [selectionEnabled]="true" [selectedCases]="emptySelected"
      (selection)="emptySelected = $event"></ccd-case-list>
    <ccd-case-list [caption]="'Unspecified cases'" [cases]="$any(undefinedCases)" [tableConfig]="tableConfig"
      [selectionEnabled]="true" [selectedCases]="undefinedSelected"
      (selection)="undefinedSelected = $event"></ccd-case-list>
  </main>`,
})
class CaseListGallery {
  constructor(readonly translations: RpxTranslationService) {}
  readonly cases: CaseRow[] = [
    { case_id: 'case-1001', reference: 'REF-1001', name: 'Synthetic Case One', created: '2024-01-10T12:00:00Z' },
    { case_id: 'case-1002', reference: 'REF-1002', name: 'Synthetic Case Two', created: '2024-02-11T12:00:00Z' },
    { case_id: 'case-1003', reference: 'REF-1003', name: 'Synthetic Case Three', created: '2024-03-12T12:00:00Z' },
  ];
  readonly secondaryCases: CaseRow[] = [
    { case_id: 'case-2001', reference: 'REF-2001', name: 'Synthetic Secondary Case', created: '2024-04-13T12:00:00Z' },
  ];
  readonly emptyCases: CaseRow[] = [];
  readonly undefinedCases: CaseRow[] | undefined;
  readonly tableConfig: TableConfig = {
    idField: 'case_id',
    columnConfigs: [
      { header: 'Case reference', key: 'reference' },
      { header: 'Name', key: 'name' },
      { header: 'Created', key: 'created', type: 'date' },
    ],
  };
  page = 1;
  selected: CaseRow[] = [];
  secondarySelected: CaseRow[] = [];
  emptySelected: CaseRow[] = [];
  undefinedSelected: CaseRow[] = [];
}

export function startCaseListGallery() {
  return bootstrapApplication(CaseListGallery, {
    providers: [
      provideRouter([{ path: 'case-list', component: CaseListGallery }]),
      importProvidersFrom(RpxTranslationModule.forRoot({
        baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false,
      })),
    ],
  });
}
