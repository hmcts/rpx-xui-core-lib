import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { WriteAddressFieldComponent } from './write-address-field.component';
import { WriteAddressInputsComponent } from './write-address-inputs.component';

@NgModule({
  declarations: [WriteAddressFieldComponent, WriteAddressInputsComponent],
  imports: [CommonModule, ReactiveFormsModule],
  exports: [WriteAddressFieldComponent, WriteAddressInputsComponent],
})
export class WriteAddressModule {}
