import { FormControl, FormGroup } from '@angular/forms';
import type { CheckboxesModel, GovUkCheckboxesComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-checkboxes';
import type { RadioButtonsModel } from '@hmcts/rpx-xui-core-lib/ui/gov-radios';
import type { GovUkTextareaComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-textarea';

export const item: CheckboxesModel = { id: 'first', value: 'first', label: 'First choice' };
export const options: RadioButtonsModel = { key: 'answer', group: new FormGroup({ answer: new FormControl('') }), config: { id: 'answer' }, errors: null, items: [{ id: 'yes', value: 'yes', label: 'Yes' }] };
export function configure(checkbox: GovUkCheckboxesComponent, textarea: GovUkTextareaComponent): void {
  checkbox.group = options.group;
  checkbox.items = [item];
  textarea.config = { id: 'notes', key: 'notes', rows: 3 };
}
// @ts-expect-error Legacy checkbox items still require their value and label.
export const incomplete: CheckboxesModel = { id: 'first' };
// @ts-expect-error Radio options retain a reactive FormGroup contract.
export const invalid: RadioButtonsModel = { ...options, group: 'answer' };
