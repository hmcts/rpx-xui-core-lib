import { CommonModule } from '@angular/common';
import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovukTableColumnConfig, GovukTableModule } from '@hmcts/rpx-xui-core-lib/ui/gov-uk-table';
import { HmctsIdentityBarModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-identity-bar';
import { LetModule } from '@hmcts/rpx-xui-core-lib/ui/let';
import { TabItem, TabsModule } from '@hmcts/rpx-xui-core-lib/ui/tabs';

@Component({
  selector: 'core-commonlib-primitives-host',
  imports: [CommonModule, GovukTableModule, HmctsIdentityBarModule, LetModule, RouterModule, TabsModule],
  template: `<main>
    <h1>CommonLib primitives</h1>
    <button type="button" (click)="value = 'second'">Update value</button>
    <div *xuilibLet="value as alias; let implicit" data-testid="let-view">
      <span data-testid="let-implicit">{{ implicit }}</span>
      <span data-testid="let-alias">{{ alias }}</span>
    </div>
    <span *xuilibLet="false as condition" data-testid="let-false">{{ condition }}</span>
    <span *xuilibLet="0 as count" data-testid="let-zero">{{ count }}</span>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <xuilib-tab [tabItems]="tabItems" ariaLabel="Service sections" (tabChange)="recordTabChange($event)" />
    <output data-testid="tab-change-index">{{ selectedIndex }}</output>
    <output data-testid="tab-change-label">{{ selectedLabel }}</output>
    <button type="button" (click)="identityContent = { name: 'Synthetic caseworker' }">Set identity</button>
    <button type="button" (click)="identityContent = { name: '' }">Clear identity</button>
    <button type="button" (click)="identityContent = {}">Remove identity name</button>
    <button type="button" (click)="identityContent = null">Clear identity content</button>
    <button type="button" (click)="identityContent = undefined">Unset identity content</button>
    <xuilib-hmcts-identity-bar [content]="identityContent" />
    <xuilib-gov-uk-table
      caption="Synthetic cases"
      [columnConfig]="tableColumns"
      [rows]="tableRows"
      [firstCellIsHeader]="true"
    />
    <xuilib-gov-uk-table
      caption="Synthetic flat cases"
      classes="core-flat-table"
      [columnConfig]="tableColumns"
      [rows]="flatTableRows"
      [firstCellIsHeader]="false"
    />
  </main>`,
})
class CommonLibPrimitivesGallery {
  value = 'first';
  selectedIndex = '';
  selectedLabel = '';
  identityContent: { name?: string | null } | null | undefined = { name: '' };
  readonly tabItems: TabItem[] = [{ text: 'Overview' }, { text: 'History' }];
  readonly tableColumns: GovukTableColumnConfig[] = [
    { header: 'Case name', key: 'caseName', type: 'text' },
    { header: 'Date opened', key: 'dateOpened', type: 'date' },
    { header: 'View case', key: 'caseLink', type: 'link' },
  ];
  readonly tableRows = [
    {
      caseName: 'SYN-123',
      dateOpened: new Date(2026, 0, 2),
      caseLink: 'Open case',
      routerLink: '/cases/SYN-123',
    },
    { caseName: 'SYN-124', dateOpened: new Date(2026, 1, 3), caseLink: 'No link' },
  ];
  readonly flatTableRows = [
    { caseName: 'SYN-222', dateOpened: new Date(2026, 2, 4), caseLink: 'Open case' },
    { caseName: 'SYN-223', dateOpened: '2026-03-05', caseLink: 'Open case' },
  ];

  constructor(public readonly translations: RpxTranslationService) {}

  recordTabChange(event: MatTabChangeEvent): void {
    this.selectedIndex = String(event.index);
    this.selectedLabel = event.tab.textLabel;
  }
}

export function startCommonLibPrimitivesGallery() {
  return bootstrapApplication(CommonLibPrimitivesGallery, {
    providers: [importProvidersFrom(
      RouterModule.forRoot([{ path: 'commonlib-primitives', component: CommonLibPrimitivesGallery }]),
      RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
    )],
  });
}
