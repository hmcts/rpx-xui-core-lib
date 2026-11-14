import { Pipe, PipeTransform } from '@angular/core';
import { PlaceholderService } from '../../directives/substitutor/services/placeholder.service';
import { CaseField } from '../../domain/definition/case-field.model';
import { FieldsUtils } from '../../services/fields/fields.utils';

@Pipe({
  name: 'ccdCaseTitle',
  standalone: false
})
export class CcdCaseTitlePipe implements PipeTransform {
  constructor(private readonly placeholderService: PlaceholderService, private readonly fieldsUtils: FieldsUtils) {
  }
  // Preserve the Toolkit public transform contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public transform(caseTitle: string, caseFields: CaseField[], values: any): any {
    const caseFieldValues = this.getReadOnlyAndFormFields(values, caseFields);
    const result = this.placeholderService.resolvePlaceholders(caseFieldValues, caseTitle);
    return result;
  }

  private getReadOnlyAndFormFields(formGroup: { getRawValue(): object }, caseFields: CaseField[]): object {
    return this.fieldsUtils.mergeLabelCaseFieldsAndFormFields(caseFields, formGroup.getRawValue());
  }

}
