import { CcdCaseTitlePipe } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/case-title/ccd-case-title.pipe';
import { CommonModule } from '@angular/common';
import { Component, Input, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { RpxTranslatePipe, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { ReadComplexFieldRawComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/complex/read-complex-field-raw.component';
import { ReadComplexFieldTableComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/complex/read-complex-field-table.component';
import { LabelSubstitutorDirective } from '../../projects/core-lib/case/editor-source/lib/shared/directives/substitutor/label-substitutor.directive';
import { PlaceholderService } from '../../projects/core-lib/case/editor-source/lib/shared/directives/substitutor/services/placeholder.service';
import { FieldsUtils } from '../../projects/core-lib/case/editor-source/lib/shared/services/fields/fields.utils';
import { ReadFieldsFilterPipe } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/complex/ccd-read-fields-filter.pipe';
import { CaseField } from '../../projects/core-lib/case/editor-source/lib/shared/domain/definition/case-field.model';

export const registered = true;
@Component({ selector: 'ccd-field-read', template: '', standalone: false })
class FieldStub { @Input() caseField: unknown; @Input() context: unknown; @Input() caseFields: unknown; @Input() topLevelFormGroup: unknown; @Input() idPrefix: unknown; }
@Pipe({ name: 'ccdIsCompound', standalone: false }) class CompoundStub implements PipeTransform { transform() { return false; } }
@Pipe({ name: 'rpxTranslate', standalone: false }) class TranslationStub implements PipeTransform { transform(value: string) { return value; } }

describe('Complex field form binding', () => {
  for (const [label, component] of [['raw', ReadComplexFieldRawComponent], ['table', ReadComplexFieldTableComponent]] as const) {
    it(`substitutes form values in the ${label} template`, async () => {
      const language$ = new BehaviorSubject('en');
      await TestBed.configureTestingModule({ imports: [CommonModule, ReactiveFormsModule], declarations: [ReadComplexFieldRawComponent, ReadComplexFieldTableComponent, LabelSubstitutorDirective, FieldStub, ReadFieldsFilterPipe, CompoundStub, TranslationStub], providers: [FieldsUtils, PlaceholderService, { provide: RpxTranslatePipe, useValue: { transform: (value: string) => value } }, { provide: RpxTranslationService, useValue: { language$, language: 'en' } }] }).compileComponents();
      const fixture = TestBed.createComponent(component);
      const field = Object.assign(new CaseField(), { id: 'child', label: 'Hello ${name}', field_type: { id: 'Text', type: 'Text' }, value: 'value' });
      fixture.componentInstance.caseField = Object.assign(new CaseField(), { id: 'parent', label: 'Parent', field_type: { id: 'Complex', type: 'Complex', complex_fields: [field] }, value: { child: 'value' } });
      const root = new FormGroup({ data: new FormGroup({ name: new FormControl('Alex') }) });
      fixture.componentInstance.topLevelFormGroup = root.controls.data;
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Hello Alex');
    });
  }
});

describe('Placeholder migration contract', () => {
  it('substitutes repeated values while leaving self-references empty', () => {
    const service = new PlaceholderService();
    expect(service.resolvePlaceholders({ name: 'Alex', age: 34, loop: '${loop}' }, '${name} ${age} ${name} ${loop}')).toBe('Alex 34 Alex ');
  });
  it('preserves null input and treats missing fields as empty', () => {
    const service = new PlaceholderService();
    expect(service.resolvePlaceholders({}, null)).toBeNull();
    expect(service.resolvePlaceholders({}, 'Before ${missing} after')).toBe('Before  after');
  });
});

describe('Case title migration contract', () => {
  it('resolves disabled form values and falls back to case fields', () => {
    const fields = [{ id: 'name', value: 'stored', field_type: { type: 'Text' } }, { id: 'caseType', value: 'Appeal', field_type: { type: 'Text' } }] as unknown as Parameters<CcdCaseTitlePipe['transform']>[1];
    const form = new FormGroup({ name: new FormControl({ value: 'Alex', disabled: true }) });
    const pipe = new CcdCaseTitlePipe(new PlaceholderService(), new FieldsUtils());
    expect(pipe.transform('${name} - ${caseType}', fields, form)).toBe('Alex - Appeal');
  });
});
