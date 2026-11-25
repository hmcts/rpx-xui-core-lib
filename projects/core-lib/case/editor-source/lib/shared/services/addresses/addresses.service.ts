import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AbstractAppConfig } from '../../../app.config';
import { AddressModel } from '../../domain/addresses';
import { HttpService } from '../http';
import { AddressParser } from './address-parser';
import { AddressType } from './address-type.enum';
import { formatPostcodeAddress } from '@hmcts/rpx-xui-core-lib/address/normalization';

@Injectable()
export class AddressesService {

  private mandatoryError: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private readonly http: HttpService, private readonly appConfig: AbstractAppConfig) {
  }

  public getAddressesForPostcode(postcode: string): Observable<AddressModel[]> {
    return this.http
      .get(this.appConfig.getPostcodeLookupUrl()
        .replace('${postcode}', postcode), undefined, false)
      .pipe(
        map(res => res.results))
      .pipe(
        map(output => output.map((addresses: Record<string, unknown>) =>
          this.format(new AddressParser().parse(addresses[AddressType.DPA]))
        ))
      );
  }

  public getMandatoryError(): Observable<boolean> {
    return this.mandatoryError.asObservable();
  }

  public setMandatoryError(value: boolean): void {
    this.mandatoryError.next(value);
  }

  private format(addressModel: AddressModel) {
    const formatted = formatPostcodeAddress({
      addressLine1: addressModel.AddressLine1,
      addressLine2: addressModel.AddressLine2,
      addressLine3: addressModel.AddressLine3,
      postTown: addressModel.PostTown,
      postCode: addressModel.PostCode,
    });
    addressModel.AddressLine1 = formatted.addressLine1;
    addressModel.AddressLine2 = formatted.addressLine2;
    addressModel.AddressLine3 = formatted.addressLine3;
    addressModel.PostTown = formatted.postTown;
    return addressModel;
  }
}
