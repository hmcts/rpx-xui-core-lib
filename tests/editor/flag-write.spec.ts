import { describe, expect, it, vi } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { CaseEditComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit/case-edit.component';
import { CaseEditSubmitComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit-submit/case-edit-submit.component';
import { SelectFlagTypeComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/components/select-flag-type/select-flag-type.component';
import { CaseFlagFormFields } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/enums';
import { CaseEventTrigger, CaseField } from '@hmcts/rpx-xui-core-lib/case/notifier';
import { CaseFlagStateService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case-flag-state.service';
import { FormValueService } from '../../projects/core-lib/case/editor-source/lib/shared/services/form/form-value.service';
import { FieldTypeSanitiser } from '../../projects/core-lib/case/editor-source/lib/shared/services/form/field-type-sanitiser';
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

  it('submits a selected new flag with persisted details and retains the snapshot for retry', () => {
    const persistedDetails = [
      { id: 'persisted-1', value: { name: 'Existing concern one', status: 'Active' } },
      { id: 'persisted-2', value: { name: 'Existing concern two', status: 'Active' } }
    ];
    const flagsField = new CaseField();
    flagsField.id = 'partyFlags';
    flagsField.field_type = { id: 'Flags', type: 'Complex', complex_fields: [] } as CaseField['field_type'];
    flagsField.value = { details: structuredClone(persistedDetails) };
    flagsField.formatted_value = { details: structuredClone(persistedDetails) };
    const snapshot = { data: { partyFlags: { details: structuredClone(persistedDetails) } } };
    const caseFlagStateService = new CaseFlagStateService();
    caseFlagStateService.initialCaseFlags = snapshot;

    const selectedType = { name: 'New concern', flagCode: 'NEW', isParent: false, flagComment: true };
    const flagsLocation = {
      pathToFlagsFormGroup: 'partyFlags',
      flags: { details: persistedDetails },
      caseField: flagsField
    };
    const selectionForm = new FormGroup({
      [CaseFlagFormFields.FLAG_TYPE]: new FormControl(selectedType),
      [CaseFlagFormFields.OTHER_FLAG_DESCRIPTION]: new FormControl(''),
      flagComments: new FormControl('New concern details'),
      selectedLocation: new FormControl(flagsLocation)
    });
    const selectFlag = Object.assign(Object.create(SelectFlagTypeComponent.prototype), {
      formGroup: selectionForm,
      selectedFlagsLocation: flagsLocation,
      isDisplayContextParameterExternal: false,
      errorMessages: [],
      subJourneyIndex: 0,
      caseFlagStateEmitter: { emit: vi.fn() },
      flagCommentsOptionalEmitter: { emit: vi.fn() },
      flagTypeSubJourneyEmitter: { emit: vi.fn() },
      addState: vi.fn()
    }) as SelectFlagTypeComponent;
    selectFlag.onNext();
    expect(selectFlag.errorMessages).toEqual([]);
    expect(flagsField.value.details).toEqual(persistedDetails);
    expect(flagsField.formatted_value.details).toEqual(persistedDetails);

    const writer = Object.assign(Object.create(WriteCaseFlagFieldComponent.prototype), {
      flagsData: [flagsLocation],
      caseFlagParentFormGroup: selectionForm,
      isDisplayContextParameterExternal: false,
      isDisplayContextParameter2Point1Enabled: false,
      rpxTranslationService: { language: 'en' }
    }) as WriteCaseFlagFieldComponent;
    writer.validateCaseFields([flagsField]);
    writer.addFlagToCollection();
    const addedFlag = flagsField.value.details.find((detail: { id?: string }) => !detail.id);
    expect(addedFlag?.value).toMatchObject({ name: 'New concern', flagCode: 'NEW' });
    expect(flagsField.value.details).toEqual([...persistedDetails, addedFlag]);

    const eventTrigger = Object.assign(new CaseEventTrigger(), {
      id: 'createFlag',
      name: 'Create case flag',
      event_token: 'event-token',
      case_fields: [flagsField, { id: 'caseFlags', field_type: { type: 'FlagLauncher' } } as CaseField],
      wizard_pages: []
    });
    const form = new FormGroup({
      data: new FormGroup({
        partyFlags: new FormControl(flagsField.value)
      }),
      event: new FormGroup({ id: new FormControl('createFlag') })
    });
    const firstSubmission = new Subject<object>();
    const retrySubmission = new Subject<object>();
    const submittedPayloads: object[] = [];
    const submit = vi.fn((payload: object) => {
      submittedPayloads.push(payload);
      return submittedPayloads.length === 1 ? firstSubmission : retrySubmission;
    });
    const editor = Object.assign(Object.create(CaseEditComponent.prototype), {
      isCaseFlagSubmission: true,
      submit,
      formValueService: new FormValueService(new FieldTypeSanitiser()),
      validPageListCaseFieldsService: {
        deleteNonValidatedFields: vi.fn(),
        validPageListCaseFields: (): never[] => []
      },
      sessionStorageService: { getItem: (): string | null => null, setItem: vi.fn(), removeItem: vi.fn() },
      abstractConfig: { logMessage: vi.fn() },
      loadingService: { register: () => 'spinner', unregister: vi.fn() },
      callbackErrorsSubject: { next: vi.fn() },
      caseFlagStateService,
      postCompleteTaskIfRequired: () => of(true),
      finishEventCompletionLogic: vi.fn()
    }) as CaseEditComponent;
    const submitComponent = Object.assign(Object.create(CaseEditSubmitComponent.prototype), {
      caseEdit: editor,
      caseFlagStateService,
      linkedCasesService: { resetLinkedCaseData: vi.fn() },
      eventTrigger,
      editForm: form,
      summary: { valid: true },
      description: { valid: true }
    }) as CaseEditSubmitComponent;

    submitComponent.submit();

    expect(submittedPayloads).toHaveLength(1);
    const expectedDetails = [...persistedDetails, addedFlag];
    const firstData = (submittedPayloads[0] as { data: Record<string, { details: unknown[] }> }).data;
    expect(firstData.partyFlags.details).toEqual(expectedDetails);
    firstSubmission.error(new Error('Synthetic event callback failure'));
    expect(caseFlagStateService.initialCaseFlags).toBe(snapshot);

    submitComponent.submit();

    expect(submittedPayloads).toHaveLength(2);
    const retryData = (submittedPayloads[1] as { data: Record<string, { details: unknown[] }> }).data;
    expect(retryData.partyFlags.details).toEqual(expectedDetails);
    retrySubmission.next({ id: 'case-1' });
    retrySubmission.complete();
    expect(caseFlagStateService.initialCaseFlags).toBeUndefined();
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
