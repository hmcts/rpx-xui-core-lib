import { FormArray } from '@angular/forms';
import { WriteTextFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/text/write-text-field.component';
import { WriteTextAreaFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/text-area/write-text-area-field.component';
import { WriteMultiSelectListFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/multi-select-list/write-multi-select-list-field.component';
import { MoneyGbpInputComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/money-gbp/money-gbp-input.component';

export const registered = true;

describe('Editor form events', () => {
  it('emits money as pence and preserves invalid input for validation', () => {
    const component = new MoneyGbpInputComponent();
    const change = jasmine.createSpy('change');
    component.registerOnChange(change);
    component.onChange({ target: { value: '12.3' } } as unknown as Event);
    expect(change).toHaveBeenCalledWith('1230');
    component.onChange({ target: { value: 'bad' } } as unknown as Event);
    expect(change).toHaveBeenCalledWith('bad');
  });
  it('trims text on blur', () => {
    const input = document.createElement('input');
    input.value = '  value  ';
    new WriteTextFieldComponent().onBlur({ target: input } as unknown as Event);
    expect(input.value).toBe('value');
  });
  it('resizes the textarea for legacy browsers', () => {
    const textarea = document.createElement('textarea');
    Object.defineProperty(textarea, 'scrollHeight', { value: 45 });
    const scrollTop = spyOnProperty(textarea, 'scrollTop', 'set').and.callThrough();
    const component = new WriteTextAreaFieldComponent({ isIEOrEdge: () => true } as unknown as ConstructorParameters<typeof WriteTextAreaFieldComponent>[0]);
    component.autoGrow({ target: textarea } as unknown as Event);
    expect(textarea.style.height).toBe('45px');
    expect(scrollTop).toHaveBeenCalledWith(45);
  });
  it('adds and removes a selected checkbox value', () => {
    const component = new WriteMultiSelectListFieldComponent();
    component.checkboxes = new FormArray([]);
    const event = { target: { value: 'option' } } as unknown as Event;
    component.onCheckChange(event);
    expect(component.checkboxes.value).toEqual(['option']);
    component.onCheckChange(event);
    expect(component.checkboxes.value).toEqual([]);
  });
});
