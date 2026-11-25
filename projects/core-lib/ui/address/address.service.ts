import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { formatPostcodeAddress, parsePostcodeAddress } from '@hmcts/rpx-xui-core-lib/address/normalization';
import { AddressModel } from './address.model';

interface AddressLookupResponse {
  results?: Array<{ DPA?: Readonly<Record<string, string | null | undefined>> }>;
}

@Injectable()
export class AddressService {
  constructor(private readonly http: HttpClient) {}

  public getAddressesForPostcode(postcode: string): Observable<AddressModel[]> {
    if (!postcode) return of([]);

    return this.http.get<AddressLookupResponse>(`/external/addresses?postcode=${postcode}`, undefined as object).pipe(
      map(response => (response.results ?? []).flatMap(result => {
        if (!result.DPA) return [];
        const normalized = formatPostcodeAddress(parsePostcodeAddress(result.DPA));
        const address = new AddressModel();
        address.addressLine1 = normalized.addressLine1;
        address.addressLine2 = normalized.addressLine2;
        address.addressLine3 = normalized.addressLine3;
        address.postTown = normalized.postTown;
        address.postCode = normalized.postCode;
        address.country = 'United Kingdom';
        return [address];
      })),
    );
  }
}
