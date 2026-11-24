import { Component, importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsPaginationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-pagination';
import { PaginationModule } from '@hmcts/rpx-xui-core-lib/ui/pagination';

@Component({
  selector: 'core-test-host',
  imports: [CommonModule, NgxPaginationModule, HmctsPaginationModule, PaginationModule],
  template: `<main>
    <h1>Pagination entries</h1>
    <section aria-label="Search result paging">
      <xuilib-pagination [paginationId]="'search-pagination'" [navigationLabel]="'Search results pagination'" [moreItems]="moreItems" [firstRecord]="firstRecord"
        (previousPage)="record('previous', $event)" (nextPage)="record('next', $event)" />
      <output data-testid="generic-event">{{ lastEvent }}</output>
    </section>
    <section aria-label="HMCTS list paging">
      <p *ngFor="let item of items | paginate: { itemsPerPage: 10, currentPage: firstPage, id: 'first-list' }">{{ item }}</p>
      <xuilib-hmcts-pagination id="first-list" [navigationLabel]="'First list pagination'" [pageSize]="10" (pageChange)="firstPage = $event" />
      <output data-testid="hmcts-page">{{ firstPage }}</output>
    </section>
    <section aria-label="HMCTS second list paging">
      <p *ngFor="let item of items | paginate: { itemsPerPage: 10, currentPage: secondPage, id: 'second-list' }">{{ item }}</p>
      <xuilib-hmcts-pagination id="second-list" [navigationLabel]="'Second list pagination'" [pageSize]="10" (pageChange)="secondPage = $event" />
      <output data-testid="hmcts-second-page">{{ secondPage }}</output>
    </section>
  </main>`,
})
class PaginationGallery {
  readonly items = Array.from({ length: 25 }, (_, index) => `Synthetic item ${index + 1}`);
  firstRecord = 1;
  moreItems = true;
  firstPage = 1;
  secondPage = 1;
  lastEvent = 'none';

  record(action: 'next' | 'previous', payload: unknown): void {
    this.lastEvent = `${action}:${payload === null ? 'null' : String(payload)}`;
    this.firstRecord = action === 'next' ? this.firstRecord + 10 : Math.max(1, this.firstRecord - 10);
    this.moreItems = this.firstRecord < this.items.length;
  }
}

export function startPaginationGallery() {
  return bootstrapApplication(PaginationGallery, {
    providers: [
      provideRouter([]),
      importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false })),
    ],
  });
}
