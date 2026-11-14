import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PageValidationService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/page-validation.service';

export const registered = true;

describe('Page validation migration contract', () => {
  it('reports invalid visible fields and excludes readonly fields', () => {
    const service = new PageValidationService({ isReadOnly: (field: { id: string }) => field.id === 'readonly', isMandatory: () => false } as unknown as ConstructorParameters<typeof PageValidationService>[0]);
    spyOn(service, 'isHidden').and.returnValue(false);
    const fields = [{ id: 'required', field_type: { id: 'Text', type: 'Text' } }, { id: 'readonly', field_type: { id: 'Text', type: 'Text' } }];
    const form = new FormGroup({ data: new FormGroup({ required: new FormControl('', Validators.required), readonly: new FormControl('') }) });
    expect(service.getInvalidFields({ case_fields: fields } as unknown as Parameters<typeof service.getInvalidFields>[0], form).map(field => field.id)).toEqual(['required']);
  });
});
