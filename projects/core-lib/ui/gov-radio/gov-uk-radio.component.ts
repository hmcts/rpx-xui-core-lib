import type { GovUiConfigModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import {Component, Input, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';

/*
* Gov Uk Radio state-less  Component responsible for
* displaying radios input and hint
*
* */
@Component({
    selector: 'xuilib-gov-radio',
    templateUrl: './gov-uk-radio.component.html',
    standalone: false
})
export class GovUkRadioComponent implements OnInit {
  constructor() { }
  @Input() public group: FormGroup;
  @Input() public config: GovUiConfigModel;

  public id: string;

  public get control(): FormControl {
    return this.group.controls[this.config.name] as FormControl;
  }
  /*
   * ngOnInIt
   * needed to manage the focus id if passed on in config
   * si it can focus on element when user clicks on error message in the header.
   **/
  public ngOnInit(): void {
    const id =  this.config.focusOn ? this.config.focusOn : this.config.value;
    this.config.id = id;
    this.config.classes = this.config.classes ?
      this.config.classes.concat(' govuk-radios__label') : 'govuk-radios__label';
  }

}
