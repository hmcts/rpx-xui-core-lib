import { CommonModule, Location } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { RpxTranslatePipe } from '@hmcts/rpx-xui-core-lib/i18n';
import { CaseEditGenericErrorsComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit-generic-errors/case-edit-generic-errors.component';
import { CaseFullAccessViewComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-full-access-view/case-full-access-view.component';
import { ActivityPollingService, AlertService, DraftService, ErrorNotifierService, LoadingService, NavigationNotifierService, OrderService, SessionStorageService } from '../../projects/core-lib/case/editor-source/lib/shared/services';
import { ConvertHrefToRouterService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/convert-href-to-router.service';
import { LinkedCasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/services';
import { CaseFlagStateService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case-flag-state.service';

export const registered = true;

@Pipe({ name: 'rpxTranslate', standalone: false }) class TranslateStub implements PipeTransform { transform(value: unknown): unknown { return value; } }
@Pipe({ name: 'ccdTabFields', standalone: false }) class TabStub implements PipeTransform { transform(value: unknown): unknown { return value; } }
@Pipe({ name: 'ccdReadFieldsFilter', standalone: false }) class FilterStub implements PipeTransform { transform(value: unknown, ...args: unknown[]): unknown { void args; return value; } }
@Pipe({ name: 'ccdIsCompound', standalone: false }) class CompoundStub implements PipeTransform { transform(value: unknown): unknown { return value; } }

function headingId(root: HTMLElement): string {
  const summary = root.querySelector<HTMLElement>('.error-summary');
  expect(summary).not.toBeNull();
  const id = summary.getAttribute('aria-labelledby');
  expect(root.querySelectorAll(`#${id}`).length).toBe(1);
  return id;
}

describe('Editor error summary accessibility', () => {
  it('associates one heading for each generic or event error branch', async () => {
    await TestBed.configureTestingModule({ imports: [CommonModule], declarations: [CaseEditGenericErrorsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CaseEditGenericErrorsComponent);
    fixture.componentInstance.error = {} as typeof fixture.componentInstance.error;
    fixture.detectChanges();
    expect(headingId(fixture.nativeElement)).toBe('edit-case-event_error-summary-heading');
    fixture.componentInstance.error = { message: 'Error' } as typeof fixture.componentInstance.error;
    fixture.detectChanges();
    expect(headingId(fixture.nativeElement)).toBe('edit-case-event_error-summary-heading');
    fixture.destroy();
  });

  it('associates one heading for each generic or callback viewer error branch', async () => {
    spyOn(CaseFullAccessViewComponent.prototype, 'ngOnInit');
    spyOn(CaseFullAccessViewComponent.prototype, 'ngOnDestroy');
    await TestBed.configureTestingModule({ imports: [CommonModule], declarations: [CaseFullAccessViewComponent, TranslateStub, TabStub, FilterStub, CompoundStub],
      providers: [ActivatedRoute, Router, NavigationNotifierService, OrderService, ActivityPollingService, MatDialog, AlertService, DraftService,
        ErrorNotifierService, ConvertHrefToRouterService, Location, SessionStorageService, RpxTranslatePipe, LoadingService, LinkedCasesService, CaseFlagStateService]
        .map(provide => ({ provide, useValue: {} })), schemas: [NO_ERRORS_SCHEMA] }).compileComponents();
    const fixture = TestBed.createComponent(CaseFullAccessViewComponent);
    fixture.componentInstance.hasPrint = false;
    fixture.componentInstance.hasEventSelector = false;
    fixture.componentInstance.caseDetails = { case_id: '123', case_type: {} } as typeof fixture.componentInstance.caseDetails;
    spyOn(fixture.componentInstance, 'hasTabsPresent').and.returnValue(false);
    fixture.componentInstance.error = {};
    fixture.detectChanges();
    expect(headingId(fixture.nativeElement)).toBe('edit-case-event_error-summary-heading');
    fixture.componentInstance.error = { details: {} };
    fixture.detectChanges();
    expect(headingId(fixture.nativeElement)).toBe('edit-case-event_error-summary-heading');
    fixture.destroy();
  });
});
