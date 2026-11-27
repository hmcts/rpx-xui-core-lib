import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { CaseEditComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit/case-edit.component';
import { CaseEditSubmitComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit-submit/case-edit-submit.component';
import { FormValueService } from '../../projects/core-lib/case/editor-source/lib/shared/services/form/form-value.service';
import { FieldTypeSanitiser } from '../../projects/core-lib/case/editor-source/lib/shared/services/form/field-type-sanitiser';
import { CaseEventTrigger } from '@hmcts/rpx-xui-core-lib/case/notifier';
import type { createFlagWriterFixture } from './flag-writer-host';

export function createFlagSubmission(host: Awaited<ReturnType<typeof createFlagWriterFixture>>) {
  const snapshot = host.state.initialCaseFlags;
  const storage = { getItem: (): null => null, setItem: (): void => undefined, removeItem: (): void => undefined };
  const payloads: object[] = [];
  const responses: Subject<object>[] = [];
  const linkedCases = { resetLinkedCaseData: (): void => undefined };
  // Services unrelated to this submission path are empty boundaries; the production submission methods run unchanged.
  const editor = new CaseEditComponent(...[
    new FormBuilder(), {}, {}, {}, {}, {}, {}, {}, storage, {},
    new FormValueService(new FieldTypeSanitiser()), {},
    { register: () => 'spinner', unregister: (): void => undefined },
    { deleteNonValidatedFields: (): void => undefined, validPageListCaseFields: (): never[] => [] },
    {}, {}, { logMessage: (): void => undefined }, host.state, {}
  ] as unknown as ConstructorParameters<typeof CaseEditComponent>);
  editor.isCaseFlagSubmission = true;
  editor.submit = (payload: object) => {
    payloads.push(structuredClone(payload));
    const response = new Subject<object>();
    responses.push(response);
    return response;
  };
  const eventTrigger = Object.assign(new CaseEventTrigger(), { id: 'createFlag', case_fields: [host.flags], wizard_pages: [] });
  const submitter = new CaseEditSubmitComponent(...[
    editor, {}, {}, {}, {}, {}, {}, {}, host.state, linkedCases, {}
  ] as unknown as ConstructorParameters<typeof CaseEditSubmitComponent>);
  submitter.eventTrigger = eventTrigger;
  submitter.editForm = new FormGroup({ data: new FormGroup({ partyFlags: new FormControl(host.flags.value) }),
    event: new FormGroup({ id: new FormControl('createFlag') }) });
  submitter.summary = new FormControl('');
  submitter.description = new FormControl('');
  return { submit: () => submitter.submit(), fail: () => responses.at(-1)?.error(new Error('Synthetic callback failure')),
    succeed: () => { responses.at(-1)?.next({ id: 'case-1' }); responses.at(-1)?.complete(); },
    evidence: () => ({ payloads, snapshotRetained: host.state.initialCaseFlags === snapshot, snapshotDetails: host.state.initialCaseFlags?.data.partyFlags.details }) };
}
