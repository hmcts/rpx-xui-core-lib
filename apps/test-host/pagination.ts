import { Component, importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsPaginationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-pagination';
import { PaginationModule } from '@hmcts/rpx-xui-core-lib/ui/pagination';
import { PaginationModule as CcdPaginationModule } from '@hmcts/rpx-xui-core-lib/ui/ccd-pagination';

@Component({
  selector: 'core-test-host',
  imports: [CommonModule, NgxPaginationModule, HmctsPaginationModule, PaginationModule, CcdPaginationModule],
  template: `<main>
    <h1>Pagination entries</h1>
    <section aria-label="CCD list paging">
      <p *ngFor="let item of ccdItems | paginate: { itemsPerPage: 10, currentPage: ccdPage, id: 'ccd-list' }">{{ item }}</p>
      <ccd-pagination id="ccd-list" [previousLabel]="'Back'" [nextLabel]="'Forward'"
        [navigationLabel]="'CCD case list pagination'"
        [screenReaderPaginationLabel]="'CCD pages'" [responsive]="true" [maxSize]="5"
        (pageChange)="ccdPage = $event" (pageBoundsCorrection)="correctCcdPage($event)" />
      <output data-testid="ccd-page">{{ ccdPage }}</output>
      <output data-testid="ccd-bounds-page">{{ ccdBoundsPage }}</output>
      <button type="button" (click)="showOneCcdPage()">Show one page</button>
    </section>
    <section aria-label="CCD single-page auto-hide">
      <p *ngFor="let item of singleItem | paginate: { itemsPerPage: 10, currentPage: 1, id: 'ccd-single-hidden' }">{{ item }}</p>
      <ccd-pagination id="ccd-single-hidden" [autoHide]="true" [navigationLabel]="'CCD hidden-page pagination'" />
    </section>
    <section aria-label="CCD single-page visible">
      <p *ngFor="let item of singleItem | paginate: { itemsPerPage: 10, currentPage: 1, id: 'ccd-single-visible' }">{{ item }}</p>
      <ccd-pagination id="ccd-single-visible" [autoHide]="false" [responsive]="true"
        [navigationLabel]="'CCD visible-page pagination'" />
    </section>
    <section aria-label="CCD default labels">
      <p *ngFor="let item of items | paginate: { itemsPerPage: 10, currentPage: ccdDefaultPage, id: 'ccd-default-labels' }">{{ item }}</p>
      <ccd-pagination id="ccd-default-labels" [navigationLabel]="'CCD default labels'"
        [screenReaderPaginationLabel]="'CCD default pages'" (pageChange)="ccdDefaultPage = $event" />
    </section>
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
    <section aria-label="HMCTS single result paging">
      <p *ngFor="let item of singleItem | paginate: { itemsPerPage: 10, currentPage: 1, id: 'single-list' }">{{ item }}</p>
      <xuilib-hmcts-pagination id="single-list" [navigationLabel]="'Single result pagination'" [pageSize]="10"
        [showPageNumbers]="false" [showResultCount]="false" />
    </section>
  </main>`,
})
class PaginationGallery {
  readonly items = Array.from({ length: 25 }, (_, index) => `Synthetic item ${index + 1}`);
  ccdItems = Array.from({ length: 25 }, (_, index) => `CCD item ${index + 1}`);
  readonly singleItem = ['Single synthetic item'];
  ccdPage = 1;
  ccdBoundsPage = 0;
  ccdDefaultPage = 1;
  firstRecord = 1;
  moreItems = true;
  firstPage = 1;
  secondPage = 1;
  lastEvent = 'none';

  record(action: 'next' | 'previous', payload: unknown): void {
    this.lastEvent = `${action}:${payload === null ? 'null' : 'unexpected'}`;
    this.firstRecord = action === 'next' ? this.firstRecord + 10 : Math.max(1, this.firstRecord - 10);
    this.moreItems = this.firstRecord + 9 < this.items.length;
  }

  showOneCcdPage(): void {
    this.ccdItems = this.ccdItems.slice(0, 5);
  }

  correctCcdPage(page: number): void {
    this.ccdBoundsPage = page;
    this.ccdPage = page;
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
