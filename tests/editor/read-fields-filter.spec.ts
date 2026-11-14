import { FieldsFilterPipe } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/complex/fields-filter.pipe';
import { ReadFieldsFilterPipe } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/complex/ccd-read-fields-filter.pipe';
import { CaseField } from '../../projects/core-lib/case/editor-source/lib/shared/domain/definition/case-field.model';

export const registered = true;

describe('Read field filtering migration contract', () => {
  it('keeps populated fields and labels while filtering empty values', () => {
    const field = (id: string, type: string, value: unknown, label = '') => Object.assign(new CaseField(), { id, label, field_type: { id: type, type }, value });
    const parent = field('parent', 'Complex', { populated: 'value', empty: '' });
    parent.field_type.complex_fields = [field('populated', 'Text', null), field('empty', 'Text', null), field('label', 'Label', null, 'Heading')];
    expect(new ReadFieldsFilterPipe().transform(parent).map(item => item.id)).toEqual(['populated', 'label']);
  });
  it('reads the selected collection entry without using a neighbouring entry', () => {
    const field = (id: string, type: string, value: unknown) => Object.assign(new CaseField(), { id, field_type: { id: type, type }, value });
    const parent = field('parent', 'Complex', [{ value: { name: 'First' } }, { value: { name: 'Second' } }]);
    parent.field_type.complex_fields = [field('name', 'Text', null)];
    const result = new FieldsFilterPipe().transform(parent, false, 1);
    expect(result.length).toBe(1);
    expect(result[0].value).toBe('Second');
  });
  it('keeps nested populated data in the general field filter', () => {
    const field = (id: string, type: string, value: unknown, label = '') => Object.assign(new CaseField(), { id, label, field_type: { id: type, type }, value });
    const parent = field('parent', 'Complex', { nested: { child: 'value' }, empty: '' });
    const nested = field('nested', 'Complex', null);
    nested.field_type.complex_fields = [field('child', 'Text', null)];
    parent.field_type.complex_fields = [nested, field('empty', 'Text', null)];
    expect(new FieldsFilterPipe().transform(parent).map(item => item.id)).toEqual(['nested']);
  });

});
