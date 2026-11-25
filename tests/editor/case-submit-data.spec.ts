import { describe, expect, it, vi } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { CaseEditSubmitComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit-submit/case-edit-submit.component';
import { CaseEditComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit/case-edit.component';

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
