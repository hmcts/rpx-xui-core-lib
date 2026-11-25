import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { CaseView } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-view/case-view.model';
import { CaseViewerComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-viewer.component';
import { CaseNotifier } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case.notifier';
import { OrderService } from '../../projects/core-lib/case/editor-source/lib/shared/services/order/order.service';

@Component({
  selector: 'ccd-case-basic-access-view',
  template: '<section data-testid="restricted-view" [attr.data-access-type]="accessType">Restricted case view</section>',
  standalone: false
})
class BasicAccessViewStub {
  @Input() public accessType: string;
  @Input() public caseDetails: CaseView;
}

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
  TestBed.resetTestingModule();
  caseView = new Subject<CaseView>();
  const routeCase = {
    tabs: [],
    metadataFields: [
      { id: '[ACCESS_PROCESS]', value: accessProcess },
      { id: '[ACCESS_GRANTED]', value: accessGranted }
    ]
  } as unknown as CaseView;

  await TestBed.configureTestingModule({
    imports: [CommonModule],
    declarations: [CaseViewerComponent, BasicAccessViewStub, FullAccessViewStub],
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: { case: routeCase } } } },
      { provide: CaseNotifier, useValue: { caseView } },
      { provide: AbstractAppConfig, useValue: {} },
      { provide: OrderService, useValue: { sort: (tabs: unknown[]) => tabs } }
    ]
  }).compileComponents();

  fixture = TestBed.createComponent(CaseViewerComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return true;
}
