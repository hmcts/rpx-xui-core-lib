import { CaseDetails as SharedCaseDetails, Draft as SharedDraft } from '@hmcts/rpx-xui-core-lib/case/models';
import { CaseDetails as EditorCaseDetails, Draft as EditorDraft } from '@hmcts/rpx-xui-core-lib/case/notifier';
import { SessionStorageService as SharedStorage } from '@hmcts/rpx-xui-core-lib/browser/session-storage';
import { SessionStorageService as EditorStorage } from '@hmcts/rpx-xui-core-lib/case/notifier';
import { CaseNotifier as EditorNotifier, CasesService as EditorCasesService, CaseAccessUtils, WizardPage, WizardPageField } from '@hmcts/rpx-xui-core-lib/case/editor-source';
import { CaseNotifier as IndependentNotifier, CasesService as IndependentCasesService } from '@hmcts/rpx-xui-core-lib/case/notifier';
import { DatePipe } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/utils/date.pipe';
import { FormatTranslatorService } from '@hmcts/rpx-xui-core-lib/case/notifier';
import { firstValueFrom, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { CaseNotifier } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case.notifier';
import { CasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/cases.service';
import { CaseView } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-view/case-view.model';

export const registered = true;

describe('Case notifier migration contract', () => {
  it('shares existing Core case detail and draft model identities', () => {
    expect(EditorCaseDetails).toBe(SharedCaseDetails);
    expect(EditorDraft).toBe(SharedDraft);
    expect(EditorDraft.isDraft('DRAFT123')).toBeTrue();
    expect(EditorDraft.stripDraftId('DRAFT123')).toBe('123');
  });
  it('shares the existing Core session storage injection token', () => {
    expect(EditorStorage).toBe(SharedStorage);
    TestBed.configureTestingModule({ providers: [SharedStorage] });
    expect(TestBed.inject(EditorStorage)).toBe(TestBed.inject(SharedStorage));
  });
  it('injects the date format translator into the moved pipe', () => {
    const translator = { translate: jasmine.createSpy('translate').and.returnValue('YYYY') };
    TestBed.configureTestingModule({ providers: [DatePipe, { provide: FormatTranslatorService, useValue: translator }] });
    expect(TestBed.inject(DatePipe).transform('2026-01-01', 'utc', 'yyyy')).toBe('2026');
    expect(translator.translate).toHaveBeenCalledOnceWith('yyyy');
  });
  it('exports the same injection tokens from both public entry points', () => {
    expect(EditorNotifier).toBe(IndependentNotifier);
    expect(EditorCasesService).toBe(IndependentCasesService);
    expect(CaseAccessUtils).toBeDefined();
    expect(WizardPage).toBeDefined();
    expect(WizardPageField).toBeDefined();
  });
  it('uses the existing CasesService injection token and a single notifier instance', () => {
    const loader = { getCaseViewV2: jasmine.createSpy('getCaseViewV2').and.returnValue(of({ tabs: [] })) };
    TestBed.configureTestingModule({ providers: [CaseNotifier, { provide: CasesService, useValue: loader }] });
    const notifier = TestBed.inject(CaseNotifier);
    expect(TestBed.inject(CaseNotifier)).toBe(notifier);
    notifier.fetchAndRefresh('123').subscribe();
    expect(loader.getCaseViewV2).toHaveBeenCalledOnceWith('123');
  });
  it('refreshes the cached case and emits its basic fields', async () => {
    const response = { case_id: '123', tabs: [{ fields: [{ id: 'caseNameHmctsInternal', field_type: { id: 'Text', type: 'Text' }, value: 'Example' }, { id: 'caseManagementLocation', field_type: { id: 'Complex', type: 'Complex' }, value: { baseLocation: 42 } }] }] };
    const loader = { getCaseViewV2: jasmine.createSpy('getCaseViewV2').and.returnValue(of(response)) };
    const notifier = new CaseNotifier(loader as unknown as ConstructorParameters<typeof CaseNotifier>[0]);
    const seen: CaseView[] = [];
    notifier.caseView.subscribe(value => seen.push(value));
    const result = await firstValueFrom(notifier.fetchAndRefresh('123'));
    expect(loader.getCaseViewV2).toHaveBeenCalledOnceWith('123');
    expect(result instanceof CaseView).toBeTrue();
    expect(result.basicFields).toEqual({ caseNameHmctsInternal: 'Example', caseManagementLocation: { baseLocation: 42 } });
    expect(notifier.cachedCaseView).toBe(result);
    expect(seen[seen.length - 1]).toBe(result);
    notifier.removeCachedCase();
    expect(notifier.cachedCaseView).toBeNull();
  });

  it('propagates failed loads without replacing the last case', async () => {
    const error = new Error('case unavailable');
    const notifier = new CaseNotifier({ getCaseViewV2: () => throwError(() => error) } as unknown as ConstructorParameters<typeof CaseNotifier>[0]);
    const previous = Object.assign(new CaseView(), { case_id: 'old' });
    notifier.cachedCaseView = previous;
    const seen: CaseView[] = [];
    notifier.caseView.subscribe(value => seen.push(value));
    await expectAsync(firstValueFrom(notifier.fetchAndRefresh('new'))).toBeRejectedWith(error);
    expect(notifier.cachedCaseView).toBe(previous);
    expect(seen.length).toBe(1);
  });
});
