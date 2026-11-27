import type { CheckboxesModel } from './checkboxes.model';
import { HtmlTemplatesHelper } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import type { ErrorMessagesModel, GovUiConfigModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';


/*
* CheckBox component - state less
* Responsible for displaying a list of gov-uk-checkboxes
* @param: options - object with data for wrapper (fieldset) and
* array of items for gov-uk-checkboxes
* @param: errors - array of error stings
* */
@Component({
    selector: 'xuilib-gov-uk-checkboxes',
    templateUrl: './gov-uk-checkboxes.component.html',
    styleUrls: ['./gov-uk-checkboxes.component.scss'],
    standalone: false
})

export class GovUkCheckboxesComponent implements OnInit {
  @Input() public group: FormGroup;
  @Input() public config: GovUiConfigModel;
  @Input() public items: CheckboxesModel[];
  @Input() public errorMessage: ErrorMessagesModel;

  public columns: CheckboxesModel[][];

  public ngOnInit() {
    this.columns = this.setColumns();
  }

  public setDescribedBy(): string {
    return HtmlTemplatesHelper.setDescribedBy(this.errorMessage?.messages?.length ? this.errorMessage : null, this.config);
  }

  public onChecked(checked: boolean, value: string) {
    const formControl = this.group.get(this.config.name);
    const array = formControl.value ? formControl.value : [];

    if (!checked) {
      const modifiedArray = array.filter((item: string) => item !== value);
      formControl.setValue(modifiedArray);
    } else {
      formControl.setValue([...array, value]);
    }
  }

  public isChecked(value: string) {
    const formControl = this.group.get(this.config.name);
    if (!formControl.value) return formControl.value;
    return formControl.value.includes(value);
  }

  private setColumns(): CheckboxesModel[][] {
    if (this.config.rows && this.config.rows > 1) {
      const array: CheckboxesModel[][] = [];

      for (let i = 0; i < this.items.length; i += this.config.rows) {
        const arrayChunk = this.items.slice(i, i + this.config.rows);
        array.push(arrayChunk);
      }

      return array;
    } else {
      return [this.items];
    }
  }
}
