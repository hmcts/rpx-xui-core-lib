import { FormControl, FormGroup } from '@angular/forms';
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
});
