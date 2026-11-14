import { EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CaseEditComponent } from '../case-edit/case-edit.component';
import { CaseEditConfirmComponent } from './case-edit-confirm.component';

describe('case confirmation form', () => {
  it('uses a form group and forwards the confirmation when submitted', () => {
    const submitted = new EventEmitter();
    const emit = spyOn(submitted, 'emit');
    const caseEdit = {
      eventTrigger: { case_fields: [] }, form: new FormGroup({}), submitted,
      confirmation: { getCaseId: () => '123', getStatus: () => 'complete' }
    } as unknown as CaseEditComponent;
    const component = new CaseEditConfirmComponent(caseEdit, {} as Router);
    expect(component.formGroup instanceof FormGroup).toBeTrue();
    component.submit();
    expect(emit).toHaveBeenCalledOnceWith({ caseId: '123', status: 'complete' });
  });
});

export const registered = true;
