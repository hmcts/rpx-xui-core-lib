import { firstValueFrom, of } from 'rxjs';
import { AddressesService } from '../../projects/core-lib/case/editor-source/lib/shared/services/addresses/addresses.service';
import { AddressParser } from '../../projects/core-lib/case/editor-source/lib/shared/services/addresses/address-parser';

export const registered = true;

describe('Address lookup migration contract', () => {
  it('preserves RD06 address lines and the Welsh country name', () => {
    const result = new AddressParser().parse({ CLASSIFICATION_CODE: 'RD06', SUB_BUILDING_NAME: 'Unit 2', ORGANISATION_NAME: 'Court', BUILDING_NAME: 'Hall', BUILDING_NUMBER: '10', THOROUGHFARE_NAME: 'High Street', POST_TOWN: 'Cardiff', POSTCODE: 'CF1', LANGUAGE: 'cy', COUNTRY_CODE: 'w' });
    expect(result.AddressLine1).toBe('Unit 2 Court');
    expect(result.AddressLine2).toBe('Hall');
    expect(result.AddressLine3).toBe('10 High Street');
    expect(result.Country).toBe('Deyrnas Unedig');
  });
  it('uses the postcode lookup and formats returned address lines', async () => {
    const http = { get: jasmine.createSpy('get').and.returnValue(of({ results: [{ DPA: { BUILDING_NUMBER: '10', THOROUGHFARE_NAME: 'DOWNING STREET', POST_TOWN: 'LONDON', POSTCODE: 'SW1A 2AA' } }] })) };
    type Dependencies = ConstructorParameters<typeof AddressesService>;
    const config = { getPostcodeLookupUrl: () => '/lookup/${postcode}' };
    const service = new AddressesService(http as unknown as Dependencies[0], config as unknown as Dependencies[1]);
    const result = await firstValueFrom(service.getAddressesForPostcode('SW1A 2AA'));
    expect(http.get).toHaveBeenCalledWith('/lookup/SW1A 2AA', undefined, false);
    expect(result[0].AddressLine1).toBe('10 Downing Street');
    expect(result[0].PostTown).toBe('London');
    expect(result[0].PostCode).toBe('SW1A 2AA');
  });
});
