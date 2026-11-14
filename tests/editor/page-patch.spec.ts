import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CaseEditPageComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit-page/case-edit-page.component';

export const registered = true;

describe('Case edit page form patch contract', () => {
  const patch = (control: FormControl, value: unknown) => {
    const form = new FormGroup({ data: new FormGroup({ field: control }) });
    CaseEditPageComponent.prototype.updateFormControlsValue.call({}, form, 'field', value);
  };

  it('keeps disabled controls unchanged', () => {
    const control = new FormControl({ value: 'original', disabled: true });
    patch(control, 'changed');
    expect(control.value).toBe('original');
  });

  it('retains optional collection when callback removes items', () => {
    const control = new FormControl(['a', 'b']);
    Object.assign(control, { caseField: { display_context: 'OPTIONAL', field_type: { type: 'Collection' } } });
    patch(control, ['a']);
    expect(control.value).toEqual(['a', 'b']);
  });

  it('preserves existing complex values when callback value is null', () => {
    const field = { id: 'field', field_type: { type: 'Complex' }, value: { child: { value: 'kept' } } };
    const page = Object.create(CaseEditPageComponent.prototype);
    page.updateEventTriggerCaseFields('field', { data: { field: { child: { value: null } } } }, { case_fields: [field] });
    expect(field.value.child.value).toBe('kept');
  });

  it('does not update event fields during a flag journey', () => {
    const field = { id: 'field', field_type: { type: 'Text' }, value: 'original' };
    const flag = { id: 'flag', field_type: { type: 'FlagLauncher' } };
    const page = Object.create(CaseEditPageComponent.prototype);
    page.updateEventTriggerCaseFields('field', { data: { field: 'changed' } }, { case_fields: [field, flag] });
    expect(field.value).toBe('original');
  });

  it('applies ordinary callback values', () => {
    const control = new FormControl('original');
    patch(control, 'changed');
    expect(control.value).toBe('changed');
  });
  it('reports a required field using its component prefix', () => {
    const page = Object.create(CaseEditPageComponent.prototype);
    const control = new FormControl('', Validators.required);
    Object.assign(control, { component: { parent: {}, idPrefix: 'parent_' } });
    page.editForm = new FormGroup({ data: new FormGroup({ field: control }) });
    page.validationErrors = [];
    page.caseFieldService = { isReadOnly: () => false };
    page.pageValidationService = { isHidden: () => false };
    page.caseEditDataService = { addFormValidationError: jasmine.createSpy('addFormValidationError') };
    page.getAutocompleteUserControlName = () => 'field';
    page.getInterpolatedFieldLabel = () => 'Field';
    page.isAutocompleteUserField = () => false;
    spyOn(CaseEditPageComponent as unknown as { scrollToTop: () => void }, 'scrollToTop');
    page.generateErrorMessage([{ id: 'field' }]);
    expect(page.caseEditDataService.addFormValidationError).toHaveBeenCalledWith({ id: 'parent_field', message: '%FIELDLABEL% is required', label: 'Field' });
    expect(control.dirty).toBeTrue();
  });

});
