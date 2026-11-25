export type PostcodeAddressRecord = Readonly<Record<string, string | null | undefined>>;

export interface NormalizedPostcodeAddress {
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  postTown: string;
  postCode: string;
  language?: string;
  countryCode?: string;
}

const value = (record: PostcodeAddressRecord, key: string): string => record[key] ?? '';
const clean = (line: string): string => line.replace(/ null|null /g, ' ').replace(/undefined/gi, '').replace(/^,/g, '').replace(/ +/g, ' ').trim();

/** Parse a Royal Mail DPA record into the shared line layout used by XUI address pickers. */
export function parsePostcodeAddress(record: PostcodeAddressRecord): NormalizedPostcodeAddress {
  const rd06 = value(record, 'CLASSIFICATION_CODE') === 'RD06';
  const line1 = rd06
    ? `${value(record, 'SUB_BUILDING_NAME')} ${value(record, 'ORGANISATION_NAME')} ${value(record, 'DEPARTMENT_NAME')} ${value(record, 'PO_BOX_NUMBER')}`
    : `${value(record, 'ORGANISATION_NAME')}${record.BUILDING_NAME ? `, ${value(record, 'BUILDING_NAME')}` : ''}${value(record, 'DEPARTMENT_NAME')} ${value(record, 'PO_BOX_NUMBER')}`;
  const line2 = rd06
    ? `${value(record, 'BUILDING_NAME')} `
    : `${value(record, 'SUB_BUILDING_NAME')} ${value(record, 'BUILDING_NUMBER')} ${value(record, 'THOROUGHFARE_NAME')}`;
  const line3 = rd06
    ? `${value(record, 'BUILDING_NUMBER')} ${value(record, 'THOROUGHFARE_NAME')}`
    : `${value(record, 'DEPENDENT_LOCALITY')} ${value(record, 'DOUBLE_DEPENDENT_LOCALITY')} ${value(record, 'DEPENDENT_THOROUGHFARE_NAME')}`;

  return {
    addressLine1: clean(line1),
    addressLine2: clean(line2),
    addressLine3: clean(line3),
    postTown: value(record, 'POST_TOWN'),
    postCode: value(record, 'POSTCODE'),
    language: record.LANGUAGE ?? undefined,
    countryCode: record.COUNTRY_CODE ?? undefined,
  };
}

/** Preserve the legacy CommonLib/Toolkit line shifting and title casing. */
export function formatPostcodeAddress<T extends NormalizedPostcodeAddress>(address: T): T {
  const formatted = { ...address };
  if (formatted.addressLine2 === '') {
    formatted.addressLine2 = formatted.addressLine3;
    formatted.addressLine3 = '';
  }
  if (formatted.addressLine1 === '') {
    formatted.addressLine1 = formatted.addressLine2;
    formatted.addressLine2 = '';
  }
  for (const key of ['addressLine1', 'addressLine2', 'addressLine3', 'postTown'] as const) {
    formatted[key] = titleCase(formatted[key]);
  }
  return formatted;
}

function titleCase(sentence: string): string {
  sentence = sentence.toLowerCase();
  sentence.split(' ').forEach(token => {
    sentence = sentence.replace(token, token.charAt(0).toUpperCase() + token.slice(1));
  });
  return sentence;
}
