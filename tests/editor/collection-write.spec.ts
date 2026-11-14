import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, Input, Pipe, PipeTransform, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { WriteCollectionFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/collection/write-collection-field.component';
import { DeleteOrCancelDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/delete-or-cancel-dialog/delete-or-cancel-dialog.component';
import { DocumentDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/document-dialog/document-dialog.component';
import { RemoveDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/remove-dialog/remove-dialog.component';
import { SaveOrDiscardDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/save-or-discard-dialog/save-or-discard-dialog.component';
import { ProfileNotifier } from '../../projects/core-lib/case/editor-source/lib/shared/services/profile/profile.notifier';

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform { transform(value: string) { return value; } }
@Pipe({ name: 'ccdFieldLabel', standalone: false })
class FieldLabelStub implements PipeTransform { transform(value: { label: string }) { return value.label; } }
@Pipe({ name: 'ccdFirstError', standalone: false })
class FirstErrorStub implements PipeTransform { transform(value: unknown) { return value; } }
let fieldStubId = 0;
@Component({ selector: 'ccd-field-write', template: '<input class="form-control" [id]="id">', standalone: false })
class FieldWriteStub {
  readonly id = `collection-stub-${fieldStubId++}`;
  @Input() caseField: unknown;
  @Input() caseFields: unknown;
  @Input() formGroup: unknown;
  @Input() parent: unknown;
  @Input() idPrefix = '';
  @Input() isExpanded: unknown;
  @Input() isInSearchBlock: unknown;
}
const dialogs: Type<{ cancel(): void }>[] = [DeleteOrCancelDialogComponent, DocumentDialogComponent, RemoveDialogComponent, SaveOrDiscardDialogComponent];
async function createDialog(index: number) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ declarations: [...dialogs, TranslateStub], providers: [{ provide: MatDialogRef, useValue: { close: (value: string) => { document.body.dataset.dialogResult = value; } } }] }).compileComponents();
  const fixture = TestBed.createComponent(dialogs[index]);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return fixture;
}
Object.assign(globalThis, { createDialogCloseHost: async (index: number) => { await createDialog(index); return true; } });

export const registered = true;
type Dependencies = ConstructorParameters<typeof WriteCollectionFieldComponent>;
type CaseField = WriteCollectionFieldComponent['caseField'];

describe('Collection field migration contract', () => {
  it('groups each rendered item while preserving add, focus, scroll and removal', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [WriteCollectionFieldComponent, FieldWriteStub, TranslateStub, FieldLabelStub, FirstErrorStub],
      providers: [
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of('Remove') }) } },
        { provide: ProfileNotifier, useValue: {} }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(WriteCollectionFieldComponent);
    const component = fixture.componentInstance;
    component.idPrefix = 'parent_';
    component.isExpanded = true;
    component.formGroup = new FormGroup({});
    component.caseField = { id: 'items', label: 'Item', display_context: 'OPTIONAL', acls: [], field_type: { type: 'Collection', collection_field_type: { id: 'Text', type: 'Text' } }, value: [{ value: 'one' }, { value: 'two' }] } as unknown as CaseField;
    document.body.appendChild(fixture.nativeElement);
    const scroll = spyOn(window, 'scrollTo');
    try {
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const wrappers = ['parent_items_0', 'parent_items_1'].map(id => root.querySelector(`#${id}`));
      expect(wrappers.every(Boolean)).toBeTrue();
      expect(wrappers.map(wrapper => wrapper?.querySelector(':scope > fieldset > legend')?.textContent.trim())).toEqual(['Item', 'Item 2']);
      expect(root.querySelectorAll('fieldset').length).toBe(2);
      const ids = Array.from(root.querySelectorAll('[id]'), element => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      (root.querySelector('.write-collection-add-item__top') as HTMLButtonElement).click();
      fixture.detectChanges();
      const added = root.querySelector('#parent_items_2');
      expect(added?.querySelector(':scope > fieldset > legend')?.textContent.trim()).toBe('Item 3');
      expect(document.activeElement).toBe(added?.querySelector('.form-control'));
      expect(scroll).toHaveBeenCalled();
      (root.querySelector('button[aria-label="Remove Item 2"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.caseField.value).toEqual([{ value: 'one' }, { value: null }]);
      expect(root.querySelectorAll('fieldset').length).toBe(2);
      expect(root.querySelector('#parent_items_1')).not.toBeNull();
    } finally {
      fixture.destroy();
      fixture.nativeElement.remove();
    }
  });
  it('renders an accessible close button for each migrated dialog', async () => {
    for (let index = 0; index < dialogs.length; index++) {
      const fixture = await createDialog(index);
      const button = fixture.nativeElement.querySelector('.dialog-header .x') as HTMLElement;
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('aria-label')).toBe('Close');
      fixture.destroy();
    }
  });
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
