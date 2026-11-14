import { Component, OnInit } from '@angular/core';
import { plainToClassFromExist } from 'class-transformer';
import { SortOrder } from '../../../domain';
import { CaseField } from '../../../domain/definition';
import { AbstractFieldReadComponent } from '../base-field/abstract-field-read.component';

@Component({
  selector: 'ccd-read-complex-field-collection-table',
  templateUrl: './read-complex-field-collection-table.html',
  styleUrls: ['./read-complex-field-collection-table.scss'],
  standalone: false
})
export class ReadComplexFieldCollectionTableComponent extends AbstractFieldReadComponent implements OnInit {
  public columns: string[];
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public columnsVerticalLabel: any;
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public columnsHorizontalLabel: any;
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public columnsAllLabels: any;
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public rows: any[] = [];
  public isHidden: boolean[] = [];
  private static isSortAscending(column: { sortOrder: SortOrder }): boolean {
    return !(column.sortOrder === SortOrder.UNSORTED || column.sortOrder === SortOrder.DESCENDING);
  }

  public ngOnInit(): void {
    super.ngOnInit();
    if (this.caseField.display_context_parameter
      && this.caseField.display_context_parameter.trim().startsWith('#TABLE(')) {

      const displayContextParameter = this.caseField.display_context_parameter.trim();
      const result: string = displayContextParameter.replace('#TABLE(', '');
      this.columns = result.replace(')', '').split(',').map((c: string) => c.trim());

      const labelsVertical: Record<string, unknown> = {};
      const labelsHorizontal: Record<string, unknown> = {};
      const allLabels: Record<string, unknown> = {};
      this.populateCaseFieldValuesIntoRows();
      this.populateLabels(labelsVertical, allLabels);
      this.populateHorizontalLabels(labelsHorizontal, allLabels, labelsVertical);

      this.columnsVerticalLabel = labelsVertical;
      this.columnsHorizontalLabel = labelsHorizontal;
      this.columnsAllLabels = allLabels;

    }
  }

  public getImage(row: number): string {
    if (this.isHidden[row]) {
      return 'assets/img/accordion-plus.png';
    } else {
      if (this.isVerticleDataNotEmpty(row)) {
        return 'assets/img/accordion-minus.png';
      } else {
        this.isHidden[row] = true;
        return 'assets/img/accordion-plus.png';
      }
    }
  }

  /**
   * Needs to be called before 'ccdFieldsFilter' pipe is used, as it needs a caseField value.
   */
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addCaseFieldValue(field: CaseField, value: any): boolean {
    field.value = value;
    return true;
  }

  public isNotBlank(value: string) {
    return value !== null && value !== '';
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addCaseReferenceValue(field: CaseField, value: any): any {
    field.value = { CaseReference: value};
    return field;
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public toCaseField(id: string, label: string, fieldType: any, value: any): CaseField {
    return plainToClassFromExist(new CaseField(), {
      id,
      label,
      display_context: 'READONLY',
      value,
      field_type: fieldType
    });
  }

  // Preserve the Toolkit ordering callback signature for existing templates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  public keepOriginalOrder = (a: any, _b: any) => a.key;

  public sortRowsByColumns(column: string): void {
    const shouldSortInAscendingOrder = this.columnsHorizontalLabel[column].sortOrder === SortOrder.UNSORTED
      || this.columnsHorizontalLabel[column].sortOrder === SortOrder.DESCENDING;

    // tslint:disable-next-line:switch-default
    switch (this.columnsHorizontalLabel[column].type.type) {
      case 'Number':
      case 'MoneyGBP': {
        if (shouldSortInAscendingOrder) {
          this.rows.sort((a, b) => a[column] - b[column]);
          this.columnsHorizontalLabel[column].sortOrder = SortOrder.ASCENDING;
        } else {
          this.rows.sort((a, b) => b[column] - a[column]);
          this.columnsHorizontalLabel[column].sortOrder = SortOrder.DESCENDING;
        }
        break;
      }
      case 'Text':
      case 'TextArea':
      case 'RichTextArea':
      case 'Email':
      case 'Date':
      case 'DateTime':
      case 'Label':
      case 'Postcode':
      case 'YesOrNo':
      case 'PhoneUK':
      case 'FixedList': {
        if (shouldSortInAscendingOrder) {
          this.rows.sort((a, b) => a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0);
          this.columnsHorizontalLabel[column].sortOrder = SortOrder.ASCENDING;
        } else {
          this.rows.sort((a, b) => a[column] < b[column] ? 1 : a[column] > b[column] ? -1 : 0);
          this.columnsHorizontalLabel[column].sortOrder = SortOrder.DESCENDING;
        }
      }
        break;
    }
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public sortWidget(column: any): string {
    return ReadComplexFieldCollectionTableComponent.isSortAscending(column) ? '&#9660;' : '&#9650;';
  }

  private populateHorizontalLabels(labelsHorizontal: Record<string, unknown>,
                                   allLabels: Record<string, unknown>,
                                   labelsVertical: Record<string, unknown>): void {
    for (const id of this.columns) {
      const trimmedId = id.trim();
      labelsHorizontal[trimmedId] = allLabels[trimmedId];
      (labelsHorizontal[trimmedId] as { sortOrder: SortOrder }).sortOrder = SortOrder.UNSORTED;
      delete labelsVertical[trimmedId];
    }
  }

  private populateLabels(labelsVertical: Record<string, unknown>, allLabels: Record<string, unknown>): void {
    for (const obj of this.caseField.field_type.complex_fields) {
      if (obj.field_type.type === 'FixedList' ||
        obj.field_type.type === 'MultiSelectList' ||
        obj.field_type.type === 'FixedRadioList') {
        labelsVertical[obj.id] = {label: obj.label, type: obj.field_type, caseField: obj};
        allLabels[obj.id] = {label: obj.label, type: obj.field_type};
      } else if (obj.isComplex()) {
        labelsVertical[obj.id] = {label: obj.label, type: obj.field_type.type, caseField: obj};
        allLabels[obj.id] = {label: obj.label, type: obj.field_type.type, caseField: obj};
      } else {
        labelsVertical[obj.id] = {label: obj.label, type: {type: obj.field_type.type}, caseField: obj};
        allLabels[obj.id] = {label: obj.label, type: {type: obj.field_type.type}, caseField: obj};
      }
    }
  }

  private populateCaseFieldValuesIntoRows(): void {
    for (const obj of this.caseField.value) {
      this.rows.push(obj.value);
      this.isHidden.push(true);
    }
  }

  private isVerticleDataNotEmpty(row: number): boolean {
    let result = false;
    for (const key in this.columnsVerticalLabel) {
      if (this.rows[row][key]) {
        result = true;
      }
    }
    return result;
  }
}
