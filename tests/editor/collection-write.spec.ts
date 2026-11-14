import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { WriteCollectionFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/collection/write-collection-field.component';

export const registered = true;
type Dependencies = ConstructorParameters<typeof WriteCollectionFieldComponent>;
type CaseField = WriteCollectionFieldComponent['caseField'];

describe('Collection field migration contract', () => {
  it('preserves distinct prefixes for complex items and labels', () => {
    const component = new WriteCollectionFieldComponent({} as Dependencies[0], {} as Dependencies[1], {} as Dependencies[2]);
    component.idPrefix = 'parent_';
    component.caseField = { id: 'items', label: 'Item', field_type: { collection_field_type: { type: 'Complex' } } } as unknown as CaseField;
    expect(component.buildIdPrefix(0)).toBe('parent_items_0_');
    expect(component.buildIdPrefix(1)).toBe('parent_items_1_');
    expect(component.itemLabel(0)).toBe('Item');
    expect(component.itemLabel(1)).toBe('Item 2');
  });
  it('removes only the confirmed item and keeps remaining control identity', () => {
    const dialog = { open: () => ({ afterClosed: () => of('Remove') }) };
    const component = new WriteCollectionFieldComponent(dialog as unknown as Dependencies[0], {} as Dependencies[1], {} as Dependencies[2]);
    const first = new FormGroup({ id: new FormControl('a') });
    const second = new FormGroup({ id: new FormControl('b') });
    component.formArray = new FormArray([first, second]);
    component.caseField = { value: [{ id: 'a' }, { id: 'b' }] } as unknown as CaseField;
    component.collItems.push(
      { uid: 'first', caseField: { id: '0' } as unknown as CaseField, item: { id: 'a' }, prefix: 'items_0_', index: 0, container: first },
      { uid: 'second', caseField: { id: '1' } as unknown as CaseField, item: { id: 'b' }, prefix: 'items_1_', index: 1, container: second }
    );
    component.openModal(0);
    expect(component.caseField.value).toEqual([{ id: 'b' }]);
    expect(component.formArray.at(0)).toBe(second);
    expect(component.collItems[0].uid).toBe('second');
    expect(component.collItems[0].index).toBe(0);
  });

  it('keeps all items when removal is cancelled', () => {
    const dialog = { open: () => ({ afterClosed: () => of('Cancel') }) };
    const component = new WriteCollectionFieldComponent(dialog as unknown as Dependencies[0], {} as Dependencies[1], {} as Dependencies[2]);
    const control = new FormGroup({ id: new FormControl('a') });
    component.formArray = new FormArray([control]);
    component.caseField = { value: [{ id: 'a' }] } as unknown as CaseField;
    component.collItems.push({ uid: 'first', caseField: { id: '0' } as unknown as CaseField, item: { id: 'a' }, prefix: 'items_0_', index: 0, container: control });
    component.openModal(0);
    expect(component.caseField.value).toEqual([{ id: 'a' }]);
    expect(component.formArray.at(0)).toBe(control);
    expect(component.collItems.length).toBe(1);
  });

});
