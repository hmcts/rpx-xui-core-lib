import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPostcodeAddress, parsePostcodeAddress } from '@hmcts/rpx-xui-core-lib/address/normalization';

test('postcode parser preserves RD06 address line placement and country metadata', () => {
  const result = parsePostcodeAddress({
    CLASSIFICATION_CODE: 'RD06',
    SUB_BUILDING_NAME: 'Unit 2',
    ORGANISATION_NAME: 'Court',
    BUILDING_NAME: 'Hall',
    BUILDING_NUMBER: '10',
    THOROUGHFARE_NAME: 'High Street',
    POST_TOWN: 'Cardiff',
    POSTCODE: 'CF1 1AA',
    LANGUAGE: 'cy',
    COUNTRY_CODE: 'w',
  });

  assert.deepEqual(result, {
    addressLine1: 'Unit 2 Court',
    addressLine2: 'Hall',
    addressLine3: '10 High Street',
    postTown: 'Cardiff',
    postCode: 'CF1 1AA',
    language: 'cy',
    countryCode: 'w',
  });
});

test('postcode parser removes absent fields and shifts formatted lines upward', () => {
  const parsed = parsePostcodeAddress({
    CLASSIFICATION_CODE: 'CM',
    BUILDING_NUMBER: '10',
    THOROUGHFARE_NAME: 'DOWNING STREET',
    POST_TOWN: 'LONDON',
    POSTCODE: 'SW1A 2AA',
  });

  assert.equal(parsed.addressLine1, '');
  assert.equal(parsed.addressLine2, '10 DOWNING STREET');
  assert.equal(parsed.addressLine3, '');
  assert.deepEqual(formatPostcodeAddress(parsed), {
    ...parsed,
    addressLine1: '10 Downing Street',
    addressLine2: '',
    postTown: 'London',
  });
});

test('postcode formatter preserves the existing first-line priority and capitalization', () => {
  assert.deepEqual(formatPostcodeAddress({
    addressLine1: 'DENTAL STUDIOS, 1',
    addressLine2: 'CLARENDON ROAD',
    addressLine3: '',
    postTown: 'BOREHAMWOOD',
    postCode: 'WD6 1BD',
    language: undefined,
    countryCode: undefined,
  }), {
    addressLine1: 'Dental Studios, 1',
    addressLine2: 'Clarendon Road',
    addressLine3: '',
    postTown: 'Borehamwood',
    postCode: 'WD6 1BD',
    language: undefined,
    countryCode: undefined,
  });
});

test('postcode parser ignores null and missing source fields without leaking sentinel text', () => {
  const result = parsePostcodeAddress({
    CLASSIFICATION_CODE: 'RD06',
    SUB_BUILDING_NAME: null,
    ORGANISATION_NAME: 'Office',
    DEPARTMENT_NAME: undefined,
    PO_BOX_NUMBER: null,
    BUILDING_NAME: 'House',
  });
  assert.equal(result.addressLine1, 'Office');
  assert.equal(result.addressLine2, 'House');
  assert.doesNotMatch(JSON.stringify(result), /undefined|null/);
});
