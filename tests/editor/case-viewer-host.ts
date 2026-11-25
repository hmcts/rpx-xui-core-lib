import { CommonModule, Location } from '@angular/common';
import { Component, Input, NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { RpxTranslatePipe } from '@hmcts/rpx-xui-core-lib/i18n';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { CaseView } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-view/case-view.model';
import { CaseViewerComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-viewer.component';
import { CaseFullAccessViewComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-full-access-view/case-full-access-view.component';
import { CaseBasicAccessViewComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-basic-access-view/case-basic-access-view.component';
import { CaseNotifier } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case.notifier';
import { CasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/cases.service';
import { ConvertHrefToRouterService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/convert-href-to-router.service';
import { CaseFlagStateService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case-flag-state.service';
import { LinkedCasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/services';
import { OrderService } from '../../projects/core-lib/case/editor-source/lib/shared/services/order/order.service';
import { ActivityPollingService, AlertService, DraftService, ErrorNotifierService, LoadingService, NavigationNotifierService, SessionStorageService } from '../../projects/core-lib/case/editor-source/lib/shared/services';

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform {
  transform(value: string): string { return value; }
}

@Pipe({ name: 'ccdCaseReference', standalone: false })
class CaseReferenceStub implements PipeTransform {
  transform(value: string): string { return value; }
}

@Component({ selector: 'cut-alert', template: '<div><ng-content></ng-content></div>', standalone: false })
class AlertStub {
  @Input() public type: string;
}

@Component({ selector: 'ccd-loading-spinner', template: '', standalone: false })
class LoadingSpinnerStub {}

@Pipe({ name: 'ccdTabFields', standalone: false })
class TabFieldsStub implements PipeTransform {
  transform(value: { fields?: unknown[] }): unknown[] { return value?.fields ?? []; }
}

@Pipe({ name: 'ccdReadFieldsFilter', standalone: false })
class ReadFieldsFilterStub implements PipeTransform {
  transform(value: unknown[]): unknown[] { return value; }
}

@Pipe({ name: 'ccdIsCompound', standalone: false })
class CompoundFieldStub implements PipeTransform {
  transform(): boolean { return false; }
}

@Component({ selector: 'ccd-field-read', template: '{{caseField?.value}}', standalone: false })
class FieldReadStub {
  @Input() public caseField: { value?: string };
}

let fixture: ReturnType<typeof TestBed.createComponent<CaseViewerComponent>>;
let caseView: Subject<CaseView>;

export async function createCaseViewerHost(accessProcess: string, accessGranted: string) {
  const routeCase = {
    case_id: 'CASE-123',
    case_type: { id: 'civil', jurisdiction: { id: 'IA' }, printEnabled: true },
    tabs: [],
    basicFields: { caseNameHmctsInternal: 'Fictional case' },
    metadataFields: [
      { id: '[ACCESS_PROCESS]', value: accessProcess },
      { id: '[ACCESS_GRANTED]', value: accessGranted }
    ]
  } as unknown as CaseView;

  return createHost({ case: routeCase });
}

export async function createCaseViewerFullAccessHost() {
  const routeCase = {
    case_id: 'CASE-123',
    case_type: { id: 'civil', jurisdiction: { id: 'IA' } },
    tabs: [{
      id: 'overview',
      label: 'Overview',
      fields: [{ id: 'summary', label: 'Summary', value: 'Fictional summary', field_type: { type: 'Text' } }]
    }],
    metadataFields: []
  } as unknown as CaseView;
  return createHost({ case: routeCase });
}

export async function createCaseViewerNotifierHost() {
  return createHost({});
}

export function emitCaseViewerDetails(accessProcess: string, accessGranted: string) {
  const caseDetails = {
    case_id: 'CASE-123',
    case_type: { id: 'civil', jurisdiction: { id: 'IA' }, printEnabled: true },
    tabs: [],
    metadataFields: [
      { id: '[ACCESS_PROCESS]', value: accessProcess },
      { id: '[ACCESS_GRANTED]', value: accessGranted }
    ]
  } as unknown as CaseView;
  caseView.next(caseDetails);
  fixture.changeDetectorRef.detectChanges();
}

export function readCaseViewerRequestUrl() {
  const component = fixture.debugElement.query(By.directive(CaseBasicAccessViewComponent)).componentInstance as CaseBasicAccessViewComponent;
  return component.getRequestUrl(component.accessType);
}

async function createHost(routeData: Record<string, unknown>) {
  TestBed.resetTestingModule();
  caseView = new Subject<CaseView>();

  await TestBed.configureTestingModule({
    imports: [CommonModule, MatTabsModule, RouterModule.forRoot([])],
    declarations: [CaseViewerComponent, CaseBasicAccessViewComponent, CaseFullAccessViewComponent, TranslateStub, CaseReferenceStub, AlertStub, LoadingSpinnerStub, TabFieldsStub, ReadFieldsFilterStub, CompoundFieldStub, FieldReadStub],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: routeData } } },
      { provide: CaseNotifier, useValue: { caseView } },
      { provide: AbstractAppConfig, useValue: {} },
      { provide: OrderService, useValue: { sort: (items: unknown[]) => items ?? [] } },
      { provide: CasesService, useValue: { getCourtOrHearingCentreName: () => of([]) } },
      { provide: ActivityPollingService, useValue: { isEnabled: false } },
      { provide: NavigationNotifierService, useValue: {} },
      { provide: MatDialog, useValue: {} },
      { provide: AlertService, useValue: { clear: (): void => undefined } },
      { provide: DraftService, useValue: {} },
      { provide: ErrorNotifierService, useValue: { errorSource: new BehaviorSubject(null), announceError: (): void => undefined } },
      { provide: ConvertHrefToRouterService, useValue: { getHrefMarkdownLinkContent: () => of('Default'), callAngularRouter: (): void => undefined } },
      { provide: SessionStorageService, useValue: { removeItem: (): void => undefined } },
      { provide: RpxTranslatePipe, useValue: { transform: (value: string) => value } },
      { provide: LoadingService, useValue: {} },
      { provide: LinkedCasesService, useValue: { resetLinkedCaseData: (): void => undefined } },
      { provide: CaseFlagStateService, useValue: { resetInitialCaseFlags: (): void => undefined } },
      Location
    ]
  }).compileComponents();

  fixture = TestBed.createComponent(CaseViewerComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return true;
}
