import { CommonModule } from '@angular/common';
import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { AddressService, WriteAddressModule } from '@hmcts/rpx-xui-core-lib/ui/address';

@Component({
  selector: 'core-test-host',
  imports: [CommonModule, ReactiveFormsModule, WriteAddressModule],
  template: `<main><h1>Address lookup</h1>
    <xuilib-write-address-field [formGroup]="form" (resetSubmission)="resetCount = resetCount + 1" (postcodeOptionSelected)="selectedCount = selectedCount + 1" />
    <output data-testid="address-value">{{ form.get('address')?.value | json }}</output>
    <output data-testid="selected-count">{{ selectedCount }}</output>
    <output data-testid="reset-count">{{ resetCount }}</output>
  </main>`,
})
class AddressGallery {
  readonly form = new FormGroup({ address: new FormGroup({
    addressLine1: new FormControl(null), addressLine2: new FormControl(null), addressLine3: new FormControl(null),
    postTown: new FormControl(null), county: new FormControl(null), postCode: new FormControl(null), country: new FormControl(null),
  }) });
  selectedCount = 0;
  resetCount = 0;
}

export function startAddressGallery() {
  return bootstrapApplication(AddressGallery, {
    providers: [provideHttpClient(), importProvidersFrom(WriteAddressModule), AddressService],
  });
}
