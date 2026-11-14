import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgxEditorModule } from 'ngx-editor';
import { WriteRichTextAreaFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/rich-text-area/write-rich-text-area-field.component';

export const registered = true;
@Pipe({ name: 'rpxTranslate', standalone: false }) class TranslatePipe implements PipeTransform { transform(value: unknown) { return value; } }
@Pipe({ name: 'ccdFieldLabel', standalone: false }) class FieldLabelPipe implements PipeTransform { transform(value: { label: string }) { return value.label; } }
@Pipe({ name: 'ccdFirstError', standalone: false }) class ErrorPipe implements PipeTransform { transform(value: unknown) { return value; } }

async function createHost() {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [CommonModule, ReactiveFormsModule, NgxEditorModule], declarations: [WriteRichTextAreaFieldComponent, TranslatePipe, FieldLabelPipe, ErrorPipe] }).compileComponents();
  const fixture = TestBed.createComponent(WriteRichTextAreaFieldComponent);
  fixture.componentInstance.caseField = { id: 'notes', label: 'Notes', field_type: { type: 'RichTextArea' }, value: '' } as unknown as typeof fixture.componentInstance.caseField;
  fixture.componentInstance.formGroup = new FormGroup({});
  document.body.appendChild(fixture.nativeElement);
  fixture.autoDetectChanges();
  Object.assign(globalThis, { readRichTextValue: () => fixture.componentInstance.formGroup.get('notes').value });
  return fixture;
}
Object.assign(globalThis, { createRichTextHost: async () => { await createHost(); return true; } });

describe('Rich text migration contract', () => {
  it('renders the real editable control and formatting toolbar', async () => {
    const fixture = await createHost();
    expect(fixture.nativeElement.querySelector('[contenteditable=true]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Numbered List"]')).not.toBeNull();
    fixture.destroy();
  });
});
