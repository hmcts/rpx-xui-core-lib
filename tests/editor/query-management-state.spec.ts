import { describe, expect, it, vi } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CaseEventTrigger, CaseView } from '../../projects/core-lib/case/editor-source/lib/shared/domain';
import { CASE_QUERIES_COLLECTION_ID, FIELD_TYPE_COMPLEX } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/constants/query-management.constants';
import { QueryCreateContext } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/models';
import { QueryManagementService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/services/query-management.service';
import { QueryWriteRaiseQueryComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/components/query-write/query-write-raise-query/query-write-raise-query.component';
import { QueryWriteRespondToQueryComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/components/query-write/query-write-respond-to-query/query-write-respond-to-query.component';

export const registered = true;

describe('Query-management case-isolation contract', () => {
  it('clears prior-case state and reports failure when the new field cannot be resolved', () => {
    const { service } = createService();
    const caseA = createEvent([queryField('case-a-field', 'Case A private message')]);
    service.setCaseQueriesCollectionData(caseA, QueryCreateContext.NEW_QUERY, caseDetails('CIVIL'));
    expect(service.fieldId).toBe('case-a-field');
    expect(service.caseQueriesCollections[0].caseMessages[0].value.subject).toBe('Case A private message');

    const result = service.setCaseQueriesCollectionData(
      createEvent([queryField('case-b-first', 'Case B first'), queryField('case-b-second', 'Case B second')]),
      QueryCreateContext.NEW_QUERY,
      caseDetails('FAMILY')
    );

    expect(result).toBe(false);
    expect(service.fieldId).toBe('');
    expect(service.caseQueriesCollections).toEqual([]);
  });

  it('does not emit a case-A payload when a new case cannot resolve its query field', () => {
    const { service } = createService();
    const caseA = createEvent([queryField('case-a-field', 'Case A private message')]);
    service.setCaseQueriesCollectionData(caseA, QueryCreateContext.NEW_QUERY, caseDetails('CIVIL'));

    const router = { snapshot: { params: {} } } as unknown as ActivatedRoute;
    const component = new QueryWriteRaiseQueryComponent(service, router);
    const emitted = vi.fn();
    component.queryDataCreated.subscribe(emitted);
    component.eventData = createEvent([queryField('case-b-first', 'Case B first'), queryField('case-b-second', 'Case B second')]);
    component.caseDetails = caseDetails('FAMILY');
    component.queryCreateContext = QueryCreateContext.NEW_QUERY;
    component.triggerSubmission = true;
    component.formGroup = new FormGroup({
      attachments: new FormControl([]),
      subject: new FormControl('Case B question'),
      body: new FormControl('Case B details'),
      isHearingRelated: new FormControl(false)
    });

    component.ngOnChanges();

    expect(emitted).not.toHaveBeenCalled();
    expect(service.fieldId).toBe('');
    expect(service.caseQueriesCollections).toEqual([]);
  });

  it('does not emit a case-A payload when a response message cannot be resolved for the new case', () => {
    const { service } = createService();
    service.setCaseQueriesCollectionData(
      createEvent([queryField('case-a-field', 'Case A private message')]),
      QueryCreateContext.NEW_QUERY,
      caseDetails('CIVIL')
    );

    const route = { snapshot: { params: { qid: '3', cid: 'case-b', dataid: 'case-b-message' } } } as unknown as ActivatedRoute;
    const component = new QueryWriteRespondToQueryComponent({} as never, route, service);
    component.caseQueriesCollections = [{
      partyName: 'Case B party',
      roleOnCase: '',
      caseMessages: [{ id: 'case-b-row', value: {
        id: 'case-b-message', subject: 'Case B message', body: 'Case B body', attachments: [] as unknown[],
        isHearingRelated: 'No', hearingDate: null, createdOn: new Date(), createdBy: 'case-b-user'
      } }]
    }] as never;
    component.eventData = createEvent([queryField('case-b-first', 'Case B first'), queryField('case-b-second', 'Case B second')]);
    component.caseDetails = caseDetails('FAMILY');
    component.queryCreateContext = QueryCreateContext.RESPOND;
    component.queryItem = { id: 'case-b-message', subject: 'Case B message', isHearingRelated: 'No', hearingDate: null } as never;
    component.triggerSubmission = true;
    component.formGroup = new FormGroup({
      body: new FormControl('Case B response'),
      attachments: new FormControl([] as unknown[]),
      closeQuery: new FormControl(false)
    });

    const emitted = vi.fn();
    component.queryDataCreated.subscribe(emitted);
    component.ngOnChanges();

    expect(emitted).not.toHaveBeenCalled();
    expect(service.fieldId).toBe('');
    expect(service.caseQueriesCollections).toEqual([]);
  });
});

function createService() {
  const router = { navigate: vi.fn() };
  const storage = { getItem: vi.fn(() => null) };
  const service = new QueryManagementService(router as never, storage as never);
  Object.defineProperty(service, 'logger', { value: { error: vi.fn(), warn: vi.fn() } });
  return { service, router };
}

function createEvent(fields: unknown[]): CaseEventTrigger {
  return { case_fields: fields } as unknown as CaseEventTrigger;
}

function queryField(id: string, subject: string) {
  return {
    id,
    field_type: { id: CASE_QUERIES_COLLECTION_ID, type: FIELD_TYPE_COMPLEX },
    display_context: 'OPTIONAL',
    value: {
      partyName: 'Case party',
      roleOnCase: '',
    caseMessages: [{ id: `${id}-row`, value: { id: `${id}-message`, subject, body: `${subject} body`, attachments: [] as unknown[] } }]
    }
  };
}

function caseDetails(jurisdictionId: string): CaseView {
  return { case_type: { jurisdiction: { id: jurisdictionId } } } as unknown as CaseView;
}
