import { describe, expect, it, vi } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { CaseEditSubmitComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit-submit/case-edit-submit.component';
import { CaseEditComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit/case-edit.component';
import { CaseFlagStateService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case-flag-state.service';
import { CaseField } from '../../projects/core-lib/case/notifier/lib/shared/domain/definition/case-field.model';

export const registered = true;

describe('Case editor submission data contract', () => {
  it('accepts existing host-owned form groups on editor and submit components', () => {
    const hostForm = new FormGroup({ custom: new FormControl('value') });
    const editor = {} as CaseEditComponent;
    const submit = {} as CaseEditSubmitComponent;
    editor.form = hostForm;
    submit.editForm = hostForm;
    expect(editor.form).toBe(hostForm);
    expect(submit.editForm).toBe(hostForm);
  });
  it('clears empty complex values but retains collections and populated objects', () => {
    const editor = Object.create(CaseEditComponent.prototype);
    const data = { empty: { child: null as null }, list: [] as unknown[], populated: { child: 'value' }, zero: { child: 0 } };
    expect(editor.replaceEmptyComplexFieldValues(data)).toEqual({ empty: null, list: [], populated: { child: 'value' }, zero: { child: 0 } });
  });

  it('selects callback or draft status according to callback outcome', () => {
    const editor = Object.create(CaseEditComponent.prototype);
    expect(editor.getStatus({ callback_response_status: 'FAILED', delete_draft_response_status: 'DELETED' })).toBe('FAILED');
    expect(editor.getStatus({ callback_response_status: 'CALLBACK_COMPLETED', delete_draft_response_status: 'DELETED' })).toBe('DELETED');
  });

  it('clears the case flag snapshot after a successful event response', () => {
    const caseFlagStateService = new CaseFlagStateService();
    caseFlagStateService.initialCaseFlags = { data: { partyFlags: { details: [{ id: 'persisted-1' }] } } };
    const finishEventCompletionLogic = vi.fn();
    const editor = Object.assign(Object.create(CaseEditComponent.prototype), {
      isCaseFlagSubmission: true,
      caseFlagStateService,
      loadingService: { register: () => 'spinner', unregister: vi.fn() },
      sessionStorageService: { setItem: vi.fn(), removeItem: vi.fn() },
      abstractConfig: { logMessage: vi.fn() },
      postCompleteTaskIfRequired: () => of(true),
      finishEventCompletionLogic
    }) as CaseEditComponent;
    const submit = (editor as unknown as {
      caseSubmit(args: { form: FormGroup; caseEventData: object; submit: () => Observable<object> }): void
    }).caseSubmit.bind(editor);

    submit({ form: new FormGroup({}), caseEventData: {}, submit: () => of({ id: 'case-1' }) });

    expect(caseFlagStateService.initialCaseFlags).toBeUndefined();
    expect(finishEventCompletionLogic).toHaveBeenCalledOnce();
  });

  it('keeps persisted case flags available when a failed submission is retried', () => {
    const persistedDetails = [{ id: 'persisted-1', value: { name: 'Existing concern', status: 'Active' } }];
    const flagsField = new CaseField();
    flagsField.id = 'partyFlags';
    flagsField.field_type = { id: 'Flags', type: 'Complex' } as CaseField['field_type'];
    flagsField.value = { details: structuredClone(persistedDetails) };
    flagsField.formatted_value = { details: structuredClone(persistedDetails) };
    const eventTrigger = {
      id: 'createFlag',
      case_fields: [flagsField, { id: 'caseFlags', field_type: { type: 'FlagLauncher' } } as CaseField]
    };
    const form = new FormGroup({
      data: new FormGroup({ partyFlags: new FormControl({ details: structuredClone(persistedDetails) }) }),
      event: new FormGroup({ id: new FormControl('createFlag') })
    });
    const snapshot = { data: { partyFlags: { details: structuredClone(persistedDetails) } } };
    const caseFlagStateService = new CaseFlagStateService();
    caseFlagStateService.initialCaseFlags = snapshot;
    const firstSubmission = new Subject<object>();
    const retrySubmission = new Subject<object>();
    const submit = vi.fn()
      .mockReturnValueOnce(firstSubmission)
      .mockReturnValueOnce(retrySubmission);
    const editor = Object.assign(Object.create(CaseEditComponent.prototype), {
      eventTrigger,
      form,
      caseDetails: { case_id: 'case-1' },
      submit,
      isCaseFlagSubmission: true,
      caseFlagStateService,
      sessionStorageService: { getItem: (): string | null => null, setItem: vi.fn(), removeItem: vi.fn() },
      abstractConfig: { logMessage: vi.fn() },
      loadingService: { register: () => 'spinner', unregister: vi.fn() },
      callbackErrorsSubject: { next: vi.fn() },
      generateCaseEventData: () => ({})
    }) as CaseEditComponent;
    const component = Object.assign(Object.create(CaseEditSubmitComponent.prototype), {
      caseEdit: editor,
      caseFlagStateService,
      linkedCasesService: { resetLinkedCaseData: vi.fn() },
      eventTrigger,
      editForm: form,
      summary: { valid: true },
      description: { valid: true }
    }) as CaseEditSubmitComponent;

    component.submit();
    expect(submit).toHaveBeenCalledOnce();
    expect(caseFlagStateService.initialCaseFlags).toBe(snapshot);

    firstSubmission.error(new Error('Synthetic event callback failure'));
    expect(caseFlagStateService.initialCaseFlags).toBe(snapshot);

    expect(() => component.submit()).not.toThrow();
    expect(submit).toHaveBeenCalledTimes(2);

    expect(caseFlagStateService.initialCaseFlags).toBe(snapshot);
    expect(flagsField.value.details).toEqual(persistedDetails);
    retrySubmission.complete();
  });

  it('clears a previous event snapshot when a new case flag journey starts', () => {
    const caseFlagStateService = new CaseFlagStateService();
    caseFlagStateService.initialCaseFlags = { data: { previousCaseFlags: { details: [{ id: 'previous-event' }] } } };
    caseFlagStateService.fieldStateToNavigate = 5;
    caseFlagStateService.pageLocation = '/previous-event';

    caseFlagStateService.resetCache('/new-event');

    expect(caseFlagStateService.initialCaseFlags).toBeUndefined();
    expect(caseFlagStateService.fieldStateToNavigate).toBeUndefined();
    expect(caseFlagStateService.pageLocation).toBe('/new-event');
  });

  it('reports a failed review-page navigation with the original error', async () => {
    const failure = new Error('Synthetic review navigation failure');
    const navigation = Promise.reject(failure);
    navigation.catch(() => {});
    const handler = { handleError: vi.fn() };
    const editor = { navigateToPage: vi.fn().mockReturnValue(navigation) };
    const component = Object.assign(Object.create(CaseEditSubmitComponent.prototype), { caseEdit: editor, errorHandler: handler });
    component.navigateToPage('review');
    await Promise.resolve();
    expect(editor.navigateToPage).toHaveBeenCalledExactlyOnceWith('review');
    expect(handler.handleError).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('reports failed confirmation navigation without resubmitting an accepted event', async () => {
    const failure = new Error('Synthetic confirmation navigation failure');
    const navigation = Promise.reject(failure);
    navigation.catch(() => {});
    const response = { id: 'case', after_submit_callback_response: { confirmation_header: 'Submitted' } };
    const submit = vi.fn().mockReturnValue(of(response));
    const handler = { handleError: vi.fn() };
    const editor = Object.assign(Object.create(CaseEditComponent.prototype), {
      errorHandler: handler,
      caseNotifier: { removeCachedCase: vi.fn() },
      sessionStorageService: { getItem: (): string | null => null, setItem: vi.fn(), removeItem: vi.fn() },
      loadingService: { register: () => 'token', unregister: vi.fn() },
      abstractConfig: { logMessage: vi.fn() },
      router: { navigate: vi.fn().mockReturnValue(navigation) },
      route: {},
      submitted: { emit: vi.fn() },
      generateCaseEventData: () => ({})
    });
    editor.onEventCanBeCompleted({ eventCanBeCompleted: true, form: {}, submit });
    await Promise.resolve();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(editor.router.navigate).toHaveBeenCalledTimes(1);
    expect(editor.submitted.emit).not.toHaveBeenCalled();
    expect(editor.caseNotifier.removeCachedCase).toHaveBeenCalledTimes(1);
    expect(handler.handleError).toHaveBeenCalledExactlyOnceWith(failure);
  });

});
