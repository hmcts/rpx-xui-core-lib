import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { CheckboxListModule } from '@hmcts/rpx-xui-core-lib/ui/checkbox-list';

@Component({
  selector: 'core-test-host',
  imports: [CheckboxListModule],
  template: `<main>
    <section aria-label="First list"><xuilib-checkbox-list [options]="options" [labelFunction]="label" (selectionChange)="first = $event" /><output data-testid="first-selection">{{first.join(',')}}</output></section>
    <section aria-label="Second list"><xuilib-checkbox-list [options]="options" [labelFunction]="label" (selectionChange)="second = $event" /><output data-testid="second-selection">{{second.join(',')}}</output></section>
  </main>`
})
class CheckboxListGallery {
  options = ['Alpha', 'Beta'];
  first: string[] = [];
  second: string[] = [];
  label = (item: string) => item;
}

export function startCheckboxListGallery() {
  return bootstrapApplication(CheckboxListGallery, {providers: [importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations',debounceTimeMs:20,validity:{days:1},testMode:false}))]});
}
