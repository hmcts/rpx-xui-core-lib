import { WriteOrganisationFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/organisation/write-organisation-field.component';

export const registered = true;

describe('Organisation search migration contract', () => {
  it('prioritises full matches and falls back to word matches without duplicates', () => {
    const converter = { toSimpleOrganisationModel: (organisation: unknown) => organisation };
    const component = new WriteOrganisationFieldComponent({} as unknown as ConstructorParameters<typeof WriteOrganisationFieldComponent>[0], converter as unknown as ConstructorParameters<typeof WriteOrganisationFieldComponent>[1], { getSessionStorage: (): null => null } as unknown as ConstructorParameters<typeof WriteOrganisationFieldComponent>[2]);
    const organisations = [
      { organisationIdentifier: '1', name: 'Alpha Legal', postCode: 'SW1 1AA' },
      { organisationIdentifier: '2', name: 'Beta Legal', postCode: 'EC1 2BB' }
    ] as unknown as Parameters<typeof component.searchOrg>[0];
    expect(component.searchOrg(organisations, 'alpha').map(item => item.organisationIdentifier)).toEqual(['1']);
    expect(component.searchOrg(organisations, 'beta missing').map(item => item.organisationIdentifier)).toEqual(['2']);
  });
});
