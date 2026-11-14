import { ReadCaseFlagFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/read-case-flag-field.component';

export const registered = true;

describe('Case flag summary migration contract', () => {
  it('selects the newly added flag from a nested location', () => {
    const component = Object.create(ReadCaseFlagFieldComponent.prototype);
    const location = {
      pathToFlagsFormGroup: 'parent.flags',
      caseField: { value: { flags: { partyName: 'Person', details: [{ id: 'existing', value: { status: 'old' } }, { value: { status: 'new' } }] } } }
    };
    expect(component.extractNewFlagToFlagDetailDisplayObject(location)).toEqual({ partyName: 'Person', flagDetail: { status: 'new' } });
  });
});
