import { AddressModel } from '../../domain/addresses/address.model';
import { CountryLanguage } from './country-language.enum';
import { parsePostcodeAddress } from '@hmcts/rpx-xui-core-lib/address/normalization';

/**
 * Moving all this logic here into Address Parser class, so that it
 * will be easier for us when we move this parsing logic to into
 * `Shim` java service.
 */
 export class AddressParser {
  // Preserve the Toolkit public contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public parse(address: any) {
    const normalized = parsePostcodeAddress(address);
    const addressModel = new AddressModel();
    addressModel.AddressLine1 = normalized.addressLine1;
    addressModel.AddressLine2 = normalized.addressLine2;
    addressModel.AddressLine3 = normalized.addressLine3;
    addressModel.PostCode = normalized.postCode;
    addressModel.PostTown = normalized.postTown;
    addressModel.Country = (address.LANGUAGE?.toUpperCase() === 'CY' && address.COUNTRY_CODE?.toUpperCase() === 'W') ? CountryLanguage.CY : CountryLanguage.EN;
    return addressModel;
  }
}
