import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AddressMessageEnum } from './address-message.enum';
import { AddressModel } from './address.model';
import { AddressOption } from './address-option.model';
import { AddressService } from './address.service';

@Component({
  selector: 'xuilib-write-address-field',
  templateUrl: './write-address-field.component.html',
  styleUrls: ['./write-address-field.component.scss'],
  standalone: false,
})
export class WriteAddressFieldComponent implements OnInit, OnChanges {
  @ViewChild('addressList', { read: ElementRef })
  public set addressListElement(element: ElementRef<HTMLSelectElement> | undefined) {
    element?.nativeElement.focus();
  }

  @Input() public formGroup!: FormGroup;
  @Input() public internationalMode = false;
  @Input() public isInternational?: boolean;
  @Input() public submissionAttempted = false;
  @Input() public startedInternational = false;
  @Input() public addressChosen = false;
  @Output() public postcodeOptionSelected = new EventEmitter<void>();
  @Output() public internationalModeStart = new EventEmitter<void>();
  @Output() public ukAddressOptionSelected = new EventEmitter<boolean>();
  @Output() public canSelectAddress = new EventEmitter<boolean>();
  @Output() public resetSubmission = new EventEmitter<void>();

  public addressField: AddressModel | null = {
    addressLine1: '', addressLine2: '', addressLine3: '', postCode: '', postTown: '', country: '', county: '',
  };
  public optionErrorsPresent = false;
  public addressSelectable = false;
  public addressFormGroup!: FormGroup;
  public addressOptions?: AddressOption[];
  public missingPostcode = false;
  public optionErrorMessage = AddressMessageEnum.NO_OPTION_SELECTED;
  public postcodeErrorMessage = AddressMessageEnum.NO_POSTCODE_SELECTED;
  public selectErrorMessage = AddressMessageEnum.SELECT_ADDRESS;

  constructor(private readonly addressesService: AddressService) {}

  public ngOnInit(): void {
    if (!this.formGroup.get('address')) this.formGroup.addControl('address', new FormControl({}));
    this.addressFormGroup = new FormGroup({
      ukAddress: new FormControl(this.isInternational === undefined ? null : (this.isInternational ? 'no' : 'yes')),
      postcode: new FormControl(''),
      addressList: new FormControl(''),
    });
    const postcode = this.formGroup.get('address.postCode')?.value;
    this.addressFormGroup.get('postcode')?.patchValue(this.isInternational === undefined ? postcode ?? '' : '');
  }

  public findAddress(): void {
    this.resetSubmission.emit();
    const value = this.addressFormGroup.get('postcode')?.value;
    if (!value) {
      this.missingPostcode = true;
      this.canSelectAddress.emit(false);
      return;
    }
    this.missingPostcode = false;
    this.addressField = null;
    const postcode = String(value);
    this.addressOptions = [];
    this.addressesService.getAddressesForPostcode(postcode.replace(' ', '').toUpperCase()).subscribe({
      next: result => {
        this.addressOptions = result.map(address => new AddressOption(address, null));
        this.addressOptions.unshift(new AddressOption(undefined, this.defaultLabel(result.length)));
      },
      error: error => {
        console.error(`An error occurred retrieving addresses for postcode ${postcode}.`, error);
        this.addressOptions = [new AddressOption(undefined, this.defaultLabel(0))];
      },
    });
    this.addressFormGroup.get('addressList')?.setValue(undefined);
  }

  public blankAddress(): void {
    this.setFormValue();
    this.resetSubmission.emit();
    if (this.internationalMode) this.internationalModeStart.emit();
  }

  public shouldShowDetailFields(): boolean {
    const address = this.formGroup.get('address')?.value;
    return Boolean(address && Object.values(address).some(value => value !== null));
  }

  public addressSelected(): void {
    this.missingPostcode = false;
    this.addressField = this.addressFormGroup.get('addressList')?.value;
    this.addressChosen = true;
    this.setFormValue();
    this.postcodeOptionSelected.emit();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['addressField']) this.setFormValue();
    if (changes['isInternational'] && this.addressFormGroup?.get('ukAddress')) {
      this.addressFormGroup.get('ukAddress')?.patchValue(this.isInternational ? 'no' : 'yes');
    }
    if (!this.addressChosen) this.addressFormGroup?.get('addressList')?.patchValue(undefined);
    this.checkIfErrorsNeeded();
  }

  public setInternationalAddress(isInternational: boolean): void {
    this.isInternational = isInternational;
    this.ukAddressOptionSelected.emit(isInternational);
  }

  public postcodeErrorPresent(isPostcodeField: boolean): boolean {
    return this.submissionAttempted && (isPostcodeField ? !this.addressSelectable : this.addressSelectable);
  }

  public postcodeLookupVisible(): boolean {
    return !this.shouldShowDetailFields() || (!this.startedInternational && !this.addressChosen);
  }

  private defaultLabel(numberOfAddresses: number): string {
    this.addressSelectable = numberOfAddresses > 0;
    this.canSelectAddress.emit(this.addressSelectable);
    return numberOfAddresses === 0 ? 'No address found' : `${numberOfAddresses}${numberOfAddresses === 1 ? ' address ' : ' addresses '}found`;
  }

  private setFormValue(): void {
    this.formGroup?.get('address')?.patchValue(this.addressField);
  }

  private checkIfErrorsNeeded(): void {
    this.optionErrorsPresent = this.submissionAttempted && this.internationalMode && !this.postcodeLookupVisible();
    if (this.optionErrorsPresent && (this.addressChosen || this.isInternational !== undefined)) this.optionErrorsPresent = false;
  }
}
