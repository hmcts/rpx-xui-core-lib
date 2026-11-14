import { DynamicRadioListPipe } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/dynamic-radio-list/dynamic-radio-list.pipe';
import { FieldTypeSanitiser } from '../../projects/core-lib/case/editor-source/lib/shared/services/form/field-type-sanitiser';
import { CaseField } from '../../projects/core-lib/case/editor-source/lib/shared/domain/definition/case-field.model';

export const registered = true;

describe('Dynamic list sanitiser migration contract', () => {
  it('preserves list definition order for nested multiselect fields', () => {
    const options = [{ code: 'a', label: 'Alpha' }, { code: 'b', label: 'Beta' }];
    const multi = { id: 'choices', field_type: { type: 'DynamicMultiSelectList' }, list_items: options };
    const complex = { id: 'person', field_type: { type: 'Complex', complex_fields: [multi] } };
    const data = { person: { choices: [{ code: 'b' }, { code: 'a' }] } };
    new FieldTypeSanitiser().sanitiseLists([complex] as unknown as CaseField[], data);
    expect(data.person.choices as unknown).toEqual({ value: options, list_items: options });
  });
  it('keeps unmatched dynamic-list strings intact', () => {
    const field = { id: 'choice', field_type: { type: 'DynamicList' }, list_items: [{ code: 'a', label: 'Alpha' }] };
    const data = { choice: 'missing' };
    new FieldTypeSanitiser().sanitiseLists([field] as unknown as CaseField[], data);
    expect(data.choice).toBe('missing');
  });
});

describe('Dynamic radio list migration contract', () => {
  it('maps a code or nested value to its label and leaves unknown codes empty', () => {
    const pipe = new DynamicRadioListPipe();
    const options = [{ code: 'a', label: 'Alpha' }, { code: 'b', label: 'Beta' }];
    expect(pipe.transform('a', options)).toBe('Alpha');
    expect(pipe.transform({ value: { code: 'b' } }, options)).toBe('Beta');
    expect(pipe.transform('missing', options)).toBe('');
    expect(pipe.transform(null, options)).toBe('');
  });
});
