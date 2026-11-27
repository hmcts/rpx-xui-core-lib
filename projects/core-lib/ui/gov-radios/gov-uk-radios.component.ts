import type { RadioButtonsModel } from './radio-buttons.model';
import type { ErrorMessagesModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { Component, Input } from '@angular/core';


/*
* Radios component - state less
* Responsible for displaying a list of gov-uk-radio components
* @param: options - object with data for wrapper (fieldset) and
* array of items for gov-uk-checkboxes
* @param: errors - array of error stings
* */
@Component({
    selector: 'xuilib-gov-uk-radios',
    templateUrl: './gov-uk-radios.component.html',
    standalone: false
})

export class GovUkRadiosComponent {

  @Input() public options: RadioButtonsModel;
  @Input() public errors: ErrorMessagesModel;

}
