import '@angular/compiler';
import assert from 'node:assert/strict';
import { firstValueFrom, of, throwError } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';
import { test } from 'node:test';
import {
  AddressMessageEnum,
  AddressModel,
  AddressOption,
  AddressService,
  WriteAddressFieldComponent,
} from '@hmcts/rpx-xui-core-lib/ui/address';

/** @param {unknown} http */
const createService = http => new AddressService(/** @type {import('@angular/common/http').HttpClient} */ (http));

test('address service preserves the external postcode endpoint and formats returned models', async () => {
  const calls = [];
  const http = {
    get: (...args) => {
      calls.push(args);
      return of({ results: [{ DPA: {
        CLASSIFICATION_CODE: 'CM',
        BUILDING_NUMBER: '10',
        THOROUGHFARE_NAME: 'DOWNING STREET',
        POST_TOWN: 'LONDON',
        POSTCODE: 'SW1A 2AA',
      } }] });
    },
  };
  const result = await firstValueFrom(createService(http).getAddressesForPostcode('SW1A2AA'));

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/external/addresses?postcode=SW1A2AA');
  assert.equal(calls[0][1], undefined);
  assert.deepEqual(result[0], Object.assign(new AddressModel(), {
    addressLine1: '10 Downing Street',
    addressLine2: '',
    addressLine3: '',
    postTown: 'London',
    postCode: 'SW1A 2AA',
    country: 'United Kingdom',
  }));
});

test('address service returns an empty list without a request for an empty postcode', async () => {
  const http = { get: () => assert.fail('empty postcode must not call HttpClient') };
  assert.deepEqual(await firstValueFrom(createService(http).getAddressesForPostcode('')), []);
});

test('address service propagates postcode lookup failures', async () => {
  const failure = new Error('postcode lookup failed');
  const service = createService({ get: () => throwError(() => failure) });
  await assert.rejects(firstValueFrom(service.getAddressesForPostcode('SW1A2AA')), failure);
});

test('address service drops results without a DPA record and handles a missing result list', async () => {
  const http = { get: () => of({ results: [{}, { DPA: null }] }) };
  assert.deepEqual(await firstValueFrom(createService(http).getAddressesForPostcode('SW1A2AA')), []);
  assert.deepEqual(await firstValueFrom(createService({ get: () => of({}) }).getAddressesForPostcode('SW1A2AA')), []);
});

test('address models and address option labels keep the CommonLib public field contract', () => {
  const address = Object.assign(new AddressModel(), {
    addressLine1: '10 Downing Street',
    addressLine2: 'Westminster',
    addressLine3: '',
    postTown: 'London',
    postCode: 'SW1A 2AA',
    country: 'United Kingdom',
  });
  const option = new AddressOption(address, null);

  assert.equal(option.description, '10 Downing Street, Westminster, London');
  assert.equal(option.value, address);
  assert.equal(AddressMessageEnum.NO_OPTION_SELECTED, 'Select an option');
});

test('address option keeps the supplied default row label without inventing an address value', () => {
  const option = new AddressOption(undefined, 'No address found');
  assert.equal(option.description, 'No address found');
  assert.equal(option.value, undefined);
});

test('address component rejects a blank postcode and emits the CommonLib lookup outputs', () => {
  let requested = false;
  const service = createService({ get: () => { requested = true; return of([]); } });
  const component = new WriteAddressFieldComponent(service);
  component.formGroup = new FormGroup({ address: new FormControl({}) });
  /** @type {boolean[]} */ const reset = [];
  /** @type {boolean[]} */ const canSelect = [];
  component.resetSubmission.subscribe(() => reset.push(true));
  component.canSelectAddress.subscribe(value => canSelect.push(value));
  component.ngOnInit();

  component.findAddress();
  assert.equal(component.missingPostcode, true);
  assert.equal(requested, false);
  assert.deepEqual(reset, [true]);
  assert.deepEqual(canSelect, [false]);
});

test('address component retains manual and international selection events', () => {
  const component = new WriteAddressFieldComponent(createService({ get: () => of([]) }));
  component.formGroup = new FormGroup({ address: new FormControl({}) });
  let startedInternational = 0;
  /** @type {boolean | undefined} */ let selectedInternational;
  component.internationalMode = true;
  component.internationalModeStart.subscribe(() => { startedInternational += 1; });
  component.ukAddressOptionSelected.subscribe(value => { selectedInternational = value; });
  component.blankAddress();
  component.setInternationalAddress(true);
  assert.equal(startedInternational, 1);
  assert.equal(selectedInternational, true);
});
