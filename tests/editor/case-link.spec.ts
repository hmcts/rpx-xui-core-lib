import { FormControl } from '@angular/forms';
import { WriteCaseLinkFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-link/write-case-link-field.component';

export const registered = true;

describe('Case link validation migration contract', () => {
  it('accepts formatted sixteen-digit references and rejects invalid values', () => {
    const component = new WriteCaseLinkFieldComponent();
    const validator = component['caseReferenceValidator']();
    expect(validator(new FormControl('1234 5678 9012 3456'))).toBeNull();
    expect(validator(new FormControl('1234'))).toEqual({ error: 'Please use a valid 16 Digit Case Reference' });
    const empty = new FormControl('');
    empty.markAsTouched();
    expect(validator(empty)).toEqual({ error: 'Please use a valid 16 Digit Case Reference' });
  });
});
