import { describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { CaseViewerComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-viewer.component';
import { CaseView } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-view/case-view.model';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { CaseNotifier } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case.notifier';
import { OrderService } from '../../projects/core-lib/case/editor-source/lib/shared/services/order/order.service';

describe('Case viewer migration contract', () => {
  it('uses resolved route data, sorts tabs, and keeps duplicate labels unique', () => {
    const caseDetails = {
      tabs: [{ label: 'Overview' }, { label: 'Roles' }, { label: 'Roles' }],
      metadataFields: []
    } as unknown as CaseView;
    const sort = vi.fn((tabs: typeof caseDetails.tabs) => tabs);
    const component = new CaseViewerComponent(
      { snapshot: { data: { case: caseDetails } } } as never,
      { caseView: new Subject<CaseView>() } as unknown as CaseNotifier,
      {} as AbstractAppConfig,
      { sort } as unknown as OrderService
    );

    component.ngOnInit();

    expect(component.caseDetails).toBe(caseDetails);
    expect(sort).toHaveBeenCalledExactlyOnceWith(caseDetails.tabs);
    expect(caseDetails.tabs.map(tab => tab.label)).toEqual(['Overview', 'Roles', 'Roles_']);
    expect(component.isDataLoaded()).toBe(true);
  });

  it('selects restricted access for challenged users until access is granted', () => {
    const component = Object.create(CaseViewerComponent.prototype) as CaseViewerComponent;
    component.setUserAccessType({ metadataFields: [
      { id: '[ACCESS_PROCESS]', value: 'CHALLENGED' },
      { id: '[ACCESS_GRANTED]', value: 'BASIC' }
    ] } as unknown as CaseView);

    expect(component.hasStandardAccess()).toBe(false);

    component.setUserAccessType({ metadataFields: [
      { id: '[ACCESS_PROCESS]', value: 'CHALLENGED' },
      { id: '[ACCESS_GRANTED]', value: 'SPECIFIC' }
    ] } as unknown as CaseView);

    expect(component.hasStandardAccess()).toBe(true);
  });

  it('uses the notifier when route data is missing and releases the subscription on destroy', () => {
    const caseView = new Subject<CaseView>();
    const component = new CaseViewerComponent(
      { snapshot: { data: {} } } as never,
      { caseView } as unknown as CaseNotifier,
      {} as AbstractAppConfig,
      { sort: (tabs: unknown[]) => tabs } as unknown as OrderService
    );
    const details = { metadataFields: [] } as unknown as CaseView;

    component.ngOnInit();
    caseView.next(details);
    expect(component.caseDetails).toBe(details);
    expect(caseView.observed).toBe(true);

    component.ngOnDestroy();
    expect(caseView.observed).toBe(false);
  });
});
