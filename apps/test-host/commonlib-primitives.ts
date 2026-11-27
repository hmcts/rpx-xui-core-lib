import { CommonModule } from '@angular/common';
import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { LetModule } from '@hmcts/rpx-xui-core-lib/ui/let';
import { TabItem, TabsModule } from '@hmcts/rpx-xui-core-lib/ui/tabs';

@Component({
  selector: 'core-commonlib-primitives-host',
  imports: [CommonModule, LetModule, TabsModule],
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
  </main>`,
})
class CommonLibPrimitivesGallery {
  value = 'first';
  selectedIndex = '';
  selectedLabel = '';
  readonly tabItems: TabItem[] = [{ text: 'Overview' }, { text: 'History' }];

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
