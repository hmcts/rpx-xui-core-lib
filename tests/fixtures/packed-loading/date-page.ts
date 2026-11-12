import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateInputModule } from '@hmcts/rpx-xui-core-lib/case/editor-date';

@Component({
  imports: [DateInputModule, ReactiveFormsModule],
  template: `<h2>Date page</h2><cut-date-input id="date" [mandatory]="true" [isDateTime]="false" [isInvalid]="false" [formControl]="date" /><p data-testid="date-value">{{date.value}}</p>`,
})
export class DatePage { date = new FormControl(''); }
