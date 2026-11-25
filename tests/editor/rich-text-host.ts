import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgxEditorModule } from 'ngx-editor';
import { WriteRichTextAreaFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/rich-text-area/write-rich-text-area-field.component';

@Pipe({ name: 'rpxTranslate', standalone: false }) class TranslatePipe implements PipeTransform { transform(value: unknown) { return value; } }
@Pipe({ name: 'ccdFieldLabel', standalone: false }) class FieldLabelPipe implements PipeTransform { transform(value: { label: string }) { return value.label; } }
@Pipe({ name: 'ccdFirstError', standalone: false }) class ErrorPipe implements PipeTransform { transform(value: unknown) { return value; } }

let fixture: ReturnType<typeof TestBed.createComponent<WriteRichTextAreaFieldComponent>>;

export async function createRichTextHost() {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [CommonModule, ReactiveFormsModule, NgxEditorModule], declarations: [WriteRichTextAreaFieldComponent, TranslatePipe, FieldLabelPipe, ErrorPipe] }).compileComponents();
  fixture = TestBed.createComponent(WriteRichTextAreaFieldComponent);
  fixture.componentInstance.caseField = { id: 'notes', label: 'Notes', field_type: { type: 'RichTextArea' }, value: '' } as unknown as typeof fixture.componentInstance.caseField;
  fixture.componentInstance.formGroup = new FormGroup({});
  document.body.appendChild(fixture.nativeElement);
  fixture.autoDetectChanges();
  return fixture;
}

export function readRichTextValue() {
  return fixture.componentInstance.formGroup.get('notes').value;
}
