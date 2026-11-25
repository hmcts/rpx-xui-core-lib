import { JsonPipe } from '@angular/common';
import { Component, Directive, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterService, type FilterConfig, type FilterSetting } from '@hmcts/rpx-xui-core-lib/ui/filter-state';
import { GenericFilterModule } from '@hmcts/rpx-xui-core-lib/ui/generic-filter';

@Directive({
  selector: 'xuilib-generic-filter[splitFilterService]',
  providers: [FilterService],
})
class SplitFilterService {}

@Component({
  imports: [GenericFilterModule, SplitFilterService, JsonPipe],
  template: `<h2>Installed filter proof</h2>
    @if (split) {
      <xuilib-generic-filter splitFilterService [config]="config" />
    } @else {
      <xuilib-generic-filter [config]="config" />
    }
    <output data-testid="filter-id">{{ config.id }}</output>
    <output data-testid="filter-provider">{{ split ? 'split' : 'shared' }}</output>
    <pre data-testid="filter-stream">{{ saved() | json }}</pre>`,
})
export class FilterPage {
  readonly split = new URLSearchParams(location.search).has('splitFilterService');
  readonly saved = signal<FilterSetting | null>(null);
  readonly config: FilterConfig = {
    id: 'packed-filter-' + crypto.randomUUID(),
    fields: [{
      name: 'subject', title: 'Subject', type: 'text-input', options: [], minSelected: 1, maxSelected: 0
    }],
    persistence: 'session',
    applyButtonText: 'Apply',
    cancelButtonText: 'Cancel',
  };

  constructor() {
    inject(FilterService).getStream(this.config.id).pipe(takeUntilDestroyed()).subscribe(setting => this.saved.set(setting));
  }
}
