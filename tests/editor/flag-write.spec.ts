import { FormControl, FormGroup } from '@angular/forms';
import { WriteCaseFlagFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/write-case-flag-field.component';
import { ManageCaseFlagsComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/components/manage-case-flags/manage-case-flags.component';

export const registered = true;

describe('Case flag writer migration contract', () => {
  it('restores matching flag statuses in root and nested details', () => {
    const component = Object.create(ManageCaseFlagsComponent.prototype) as ManageCaseFlagsComponent;
    const root = { id: 'flag-1', status: 'changed' };
    const nested = { id: 'flag-1', value: { status: 'changed' } };
    const other = { id: 'flag-2', status: 'untouched' };
    const selected = { flagDetailDisplay: { flagDetail: { id: 'flag-1' } }, originalStatus: 'Active' } as unknown as Parameters<ManageCaseFlagsComponent['onFlagSelectionChange']>[0];
    Object.assign(component, {
      selectedControlName: 'selectedManageCaseLocation',
      formGroup: new FormGroup({ selectedManageCaseLocation: new FormControl(null) }),
      flagsDisplayData: [selected],
      flagsData: [{ flags: { details: [root, other] }, caseField: { _value: { flags: { details: [nested] } } } }]
    });
    component.onFlagSelectionChange(selected);
    expect(root.status).toBe('Active');
    expect(nested.value.status).toBe('Active');
    expect(other.status).toBe('untouched');
  });
  it('keeps a new flag available when no persisted matching detail exists', () => {
    const component = Object.create(ManageCaseFlagsComponent.prototype) as ManageCaseFlagsComponent;
    const detail = { id: 'new-flag', status: 'Requested' } as unknown as Parameters<ManageCaseFlagsComponent['mapFlagDetailForDisplay']>[0];
    const flags = { flags: {}, pathToFlagsFormGroup: 'flags', caseField: { id: 'flags', formatted_value: { details: [] } } } as unknown as Parameters<ManageCaseFlagsComponent['mapFlagDetailForDisplay']>[1];
    const result = component.mapFlagDetailForDisplay(detail, flags, undefined, undefined);
    expect(result.flagDetailDisplay.flagDetail).toBe(detail);
    expect(result.originalStatus).toBeUndefined();
  });
  it('copies formatted values while retaining other case-field values', () => {
    const component = Object.create(WriteCaseFlagFieldComponent.prototype);
    const fields = [{ value: { status: 'old', extra: 'kept' }, formatted_value: { status: 'new' } }, { value: { status: 'unchanged' } }];
    expect(component.validateCaseFields(fields)).toBe(fields);
    expect(fields[0].value).toEqual({ status: 'new', extra: 'kept' });
    expect(fields[1].value).toEqual({ status: 'unchanged' });
  });
});
