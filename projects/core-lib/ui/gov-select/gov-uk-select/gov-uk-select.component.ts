import {Component, Input} from '@angular/core';
import {FormGroup} from '@angular/forms';
import { ErrorMessagesModel, GovUiConfigModel, HtmlTemplatesHelper } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
/*
* Gov Uk Select Dumb Component responsible for
* dropdown input.
* */
@Component({
    selector: 'xuilib-gov-select',
    templateUrl: './gov-uk-select.component.html',
    standalone: false
})
export class GovUkSelectComponent {
  constructor() {}
  @Input() public errorMessage: ErrorMessagesModel;
  @Input() public group: FormGroup;
  @Input() public config: GovUiConfigModel;
  // {hint: string; name: string; id: string,  isPageHeading: boolean, classes: string };
  @Input() public items: { label: string, value: string; id: string; }[];

  public setDescribedBy(): string {
    return HtmlTemplatesHelper.setDescribedBy(this.errorMessage?.messages?.length ? this.errorMessage : null, this.config);
  }
}
