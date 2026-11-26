import { describe, expect, it } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import { SelectFlagTypeComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/components/select-flag-type/select-flag-type.component';
import { CaseFlagFormFields } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/enums';
import { CaseField } from '../../projects/core-lib/case/notifier/lib/shared/domain/definition/case-field.model';
import { FormValueService } from '../../projects/core-lib/case/editor-source/lib/shared/services/form/form-value.service';
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

  it('retains persisted case flags through a new flag selection and submission mapping', () => {
    const persistedDetails = [
      { id: 'persisted-1', value: { name: 'Existing concern one', status: 'Active' } },
      { id: 'persisted-2', value: { name: 'Existing concern two', status: 'Active' } }
    ];
    const flagsField = new CaseField();
    flagsField.id = 'partyFlags';
    flagsField.field_type = { id: 'Flags', type: 'Complex' } as CaseField['field_type'];
    flagsField.value = { details: structuredClone(persistedDetails) };
    flagsField.formatted_value = { details: structuredClone(persistedDetails) };

    const selectedType = { name: 'New concern', flagCode: 'NEW', isParent: false, flagComment: true };
    const selectFlag = Object.assign(Object.create(SelectFlagTypeComponent.prototype), {
      formGroup: new FormGroup({
        [CaseFlagFormFields.FLAG_TYPE]: new FormControl(selectedType),
        [CaseFlagFormFields.OTHER_FLAG_DESCRIPTION]: new FormControl('')
      }),
      selectedFlagsLocation: { caseField: flagsField },
      isDisplayContextParameterExternal: false,
      errorMessages: [],
      subJourneyIndex: 0,
      caseFlagStateEmitter: { emit: (): void => undefined },
      flagCommentsOptionalEmitter: { emit: (): void => undefined },
      flagTypeSubJourneyEmitter: { emit: (): void => undefined },
      addState: (): void => undefined
    }) as SelectFlagTypeComponent;

    selectFlag.onNext();

    const caseEventData = { partyFlags: { details: structuredClone(persistedDetails) } };
    const formValueService = Object.create(FormValueService.prototype) as FormValueService;
    formValueService.repopulateFormDataFromCaseFieldValues(caseEventData, [
      flagsField,
      { id: 'caseFlags', field_type: { type: 'FlagLauncher' } } as CaseField
    ]);

    expect(caseEventData.partyFlags.details).toEqual(persistedDetails);
  });

  it('replaces only a prior unsaved flag when the writer adds another flag', () => {
    const flagsField = new CaseField();
    flagsField.id = 'partyFlags';
    flagsField.field_type = { id: 'Flags', type: 'Complex' } as CaseField['field_type'];
    flagsField.value = {
      details: [
        { id: 'persisted-1', value: { name: 'Existing concern', status: 'Active' } },
        { value: { name: 'Old unsaved concern' } }
      ]
    };
    const flagLocation = { pathToFlagsFormGroup: 'partyFlags', caseField: flagsField };
    const writer = Object.assign(Object.create(WriteCaseFlagFieldComponent.prototype), {
      flagsData: [flagLocation],
      selectedFlagsLocation: flagLocation,
      caseFlagParentFormGroup: new FormGroup({}),
      isDisplayContextParameterExternal: false,
      determineLocationForFlag: () => flagLocation,
      populateNewFlagDetailInstance: () => ({ name: 'New unsaved concern' })
    }) as WriteCaseFlagFieldComponent;

    writer.addFlagToCollection();

    expect(flagsField.value.details).toEqual([
      { id: 'persisted-1', value: { name: 'Existing concern', status: 'Active' } },
      { value: { name: 'New unsaved concern' } }
    ]);
  });
});
