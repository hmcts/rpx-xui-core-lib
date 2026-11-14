import { FormGroup } from '@angular/forms';
import type { Observable } from 'rxjs';
import type { Wizard } from '../../components/case-editor/domain/wizard.model';
import { CaseEventData, CaseEventTrigger, CaseView, Profile } from '../../domain';
interface CaseEditModel {
  wizard: Wizard;
  currentPageId: string;
  eventTrigger: CaseEventTrigger;
  form: FormGroup;
  eventCanBeCompleted: boolean;
  caseDetails: CaseView;
  caseEventData: CaseEventData;
  submit(caseEventData: CaseEventData, profile?: Profile): Observable<object>;
}

// Preserve the Toolkit interface, including declaration merging.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CaseEditGetNextPage
  extends Pick<CaseEditModel, 'wizard' | 'currentPageId' | 'eventTrigger' | 'form'> { }

// Preserve the Toolkit interface, including declaration merging.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CaseEditSubmitForm
  extends Pick<CaseEditModel, 'eventTrigger' | 'form' | 'caseDetails' | 'submit'> { }

// Preserve the Toolkit interface, including declaration merging.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CaseEditGenerateCaseEventData
  extends Pick<CaseEditModel, 'eventTrigger' | 'form'> { }

// Preserve the Toolkit interface, including declaration merging.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CaseEditCaseSubmit
  extends Pick<CaseEditModel, 'form' | 'caseEventData' | 'submit'> { }

// Preserve the Toolkit interface, including declaration merging.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CaseEditonEventCanBeCompleted
  extends Pick<CaseEditModel, 'eventCanBeCompleted' | 'eventTrigger' | 'caseDetails' | 'form' | 'submit'> { }