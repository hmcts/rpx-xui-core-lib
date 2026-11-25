import { Component, Input, OnChanges } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AddressMessageEnum } from './address-message.enum';

@Component({
  selector: 'xuilib-write-address-inputs',
  templateUrl: './write-address-inputs.component.html',
  standalone: false,
})
export class WriteAddressInputsComponent implements OnChanges {
  public MESSAGE_ENUM = AddressMessageEnum;
  @Input() public formGroup!: FormGroup;
  @Input() public isInternational = false;
  @Input() public submissionAttempted = false;
  public errorsPresent = false;

  public ngOnChanges(): void {
    this.errorsPresent = !this.formGroup?.get('address')?.valid;
  }
}
