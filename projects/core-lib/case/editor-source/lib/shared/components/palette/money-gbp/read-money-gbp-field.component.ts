import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AbstractFieldReadComponent } from '../base-field/abstract-field-read.component';

@Component({
  selector: 'ccd-read-money-gbp-field',
  template: `<ng-container *ngIf="isNumber()"><span class="text-16">{{value / 100 | currency:'GBP':'symbol'}}</span></ng-container>`,
  standalone: false
})
export class ReadMoneyGbpFieldComponent extends AbstractFieldReadComponent implements OnInit {

  @Input()
  // Preserve the Toolkit public contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public amount: any;
  // Preserve the Toolkit public contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public value: any;

  public ngOnInit(): void {
    if (this.amount) {
      this.value = this.amount;
    } else if (this.caseField) {
      this.registerControl(new FormControl(this.caseField.value));
      this.value = this.caseField.value;
    }
  }

  public isNumber(): boolean {
    return null !== this.value && !isNaN(this.value);
  }

}
