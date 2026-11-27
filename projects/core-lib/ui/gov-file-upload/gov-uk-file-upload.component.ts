import { HtmlTemplatesHelper } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import type { ErrorMessagesModel, GovUiConfigModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import {Component, Input, OnInit} from '@angular/core';
import {FormGroup} from '@angular/forms';



/*
* Gov UK Input component
* Responsible for displaying input, hint and error messages
* @prop errorMessages - array of messages
* @prop focusOn - passing the FormGroup
* @prop config - adding configuration
* */
@Component({
    selector: 'xuilib-gov-uk-file-upload',
    templateUrl: './gov-uk-file-upload.component.html',
    standalone: false
})
export class GovUkFileUploadComponent implements OnInit {
  constructor() { }
  @Input() public errorMessage: ErrorMessagesModel;
  @Input() public group: FormGroup;
  @Input() public config: GovUiConfigModel;
  // { label: string, hint: string; name: string; id: string, type: string; isPageHeading: boolean, classes: string };

  public reloadInput = true;

  public ngOnInit(): void {
    this.config.classes = 'govuk-label--m';
  }

  public setDescribedBy(): string {
    return HtmlTemplatesHelper.setDescribedBy(this.errorMessage?.messages?.length ? this.errorMessage : null, this.config);
  }
}
