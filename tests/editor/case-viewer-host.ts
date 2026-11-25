import { CommonModule } from '@angular/common';
import { Component, Input, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { CaseView } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-view/case-view.model';
import { CaseViewerComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-viewer.component';
import { CaseBasicAccessViewComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-basic-access-view/case-basic-access-view.component';
import { CaseNotifier } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case.notifier';
import { CasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/cases.service';
import { OrderService } from '../../projects/core-lib/case/editor-source/lib/shared/services/order/order.service';

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

@Component({
  selector: 'ccd-case-full-access-view',
  template: '<section data-testid="full-view">Full case view</section>',
  standalone: false
})
class FullAccessViewStub {
  @Input() public caseDetails: CaseView;
  @Input() public hasPrint: boolean;
  @Input() public hasEventSelector: boolean;
  @Input() public prependedTabs: unknown[];
  @Input() public appendedTabs: unknown[];
}

let fixture: ReturnType<typeof TestBed.createComponent<CaseViewerComponent>>;
let caseView: Subject<CaseView>;

export async function createCaseViewerHost(accessProcess: string, accessGranted: string) {
  const routeCase = {
    case_id: 'CASE-123',
    tabs: [],
    basicFields: { caseNameHmctsInternal: 'Fictional case' },
    metadataFields: [
      { id: '[ACCESS_PROCESS]', value: accessProcess },
      { id: '[ACCESS_GRANTED]', value: accessGranted }
    ]
  } as unknown as CaseView;

  return createHost({ case: routeCase });
}

export async function createCaseViewerNotifierHost() {
  return createHost({});
}

export function emitCaseViewerDetails(accessProcess: string, accessGranted: string) {
  const caseDetails = {
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
    imports: [CommonModule, RouterModule.forRoot([])],
    declarations: [CaseViewerComponent, CaseBasicAccessViewComponent, FullAccessViewStub, TranslateStub, CaseReferenceStub, AlertStub, LoadingSpinnerStub],
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: routeData } } },
      { provide: CaseNotifier, useValue: { caseView } },
      { provide: AbstractAppConfig, useValue: {} },
      { provide: OrderService, useValue: { sort: (tabs: unknown[]) => tabs } },
      { provide: CasesService, useValue: { getCourtOrHearingCentreName: () => of([]) } }
    ]
  }).compileComponents();

  fixture = TestBed.createComponent(CaseViewerComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return true;
}
