import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { plainToClassFromExist } from 'class-transformer';
import { WizardPage } from '../../components/case-editor/domain/wizard-page.model';
import { CaseField } from '../../domain/definition';

@Pipe({
  name: 'ccdPageFields',
  standalone: false
})
export class CcdPageFieldsPipe implements PipeTransform {
  public transform(page: WizardPage, dataFormGroup: FormGroup): CaseField {
    const complexFields: CaseField[] = Object.keys((dataFormGroup.controls['data'] as FormGroup).controls).map(key => {
      const control = (dataFormGroup.controls['data'] as FormGroup).get(key) as AbstractControl & { caseField?: CaseField };
      return control['caseField'] as CaseField;
    }).filter(field => {
      return field && !!page.case_fields.find(pcf => pcf.id === field.id);
    }).sort((a, b) => a.order - b.order);

    const rawValue: Record<string, unknown> = dataFormGroup.value;

    const value = page.case_fields.reduce<Record<string, unknown>>((acc, field) => {
      const fieldValue = rawValue[field.id] || field.value;
      return { ...acc, [field.id]: fieldValue };
    }, {});
    return plainToClassFromExist(new CaseField(), {
      id: page.id,
      label: page.label,
      display_context: 'READONLY',
      value,
      field_type: {
        id: page.id,
        type: 'Complex',
        complex_fields: complexFields
      }
    });
  }
}
