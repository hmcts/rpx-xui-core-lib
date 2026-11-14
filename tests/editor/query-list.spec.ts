import { FormControl, FormGroup } from '@angular/forms';
import { QueryManagementUtils } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/utils/query-management.utils';
import { QueryListComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/components/query-list/query-list.component';

export const registered = true;

describe('Query list migration contract', () => {
  it('sorts text and dates in both directions', () => {
    const component = new QueryListComponent();
    component.queryListData = { queries: [{ subject: 'B', lastSubmittedDate: new Date('2024-01-02') }, { subject: 'A', lastSubmittedDate: new Date('2024-01-01') }] } as unknown as typeof component.queryListData;
    const subject = component.displayedColumns.find(column => column.name === 'subject');
    const date = component.displayedColumns.find(column => column.name === 'lastSubmittedDate');
    component.sortTable(subject);
    expect(component.queryListData.queries.map(query => query.subject)).toEqual(['A', 'B']);
    component.sortTable(subject);
    expect(component.queryListData.queries.map(query => query.subject)).toEqual(['B', 'A']);
    component.sortTable(date);
    expect(component.queryListData.queries.map(query => query.subject)).toEqual(['A', 'B']);
    component.sortTable(date);
    expect(component.queryListData.queries.map(query => query.subject)).toEqual(['B', 'A']);
  });
  it('preserves Toolkit staff markers only on new staff queries', () => {
    const form = new FormGroup({ attachments: new FormControl([]), subject: new FormControl('Subject'), body: new FormControl('Body'), isHearingRelated: new FormControl(false) });
    const user = { id: 'user', name: 'User' };
    expect(QueryManagementUtils.getNewQueryData(form, user, ' Yes ').isHmctsStaff).toBe(' Yes ');
    expect(QueryManagementUtils.getNewQueryData(form, user, 'No').isHmctsStaff).toBeUndefined();
    expect(QueryManagementUtils.getNewQueryData(form, user, '').isHmctsStaff).toBeUndefined();
  });

  it('preserves the absent staff marker on query responses', () => {
    const form = new FormGroup({ attachments: new FormControl([]), body: new FormControl('Body'), closeQuery: new FormControl(false) });
    const query = { id: 'query', subject: 'Subject' } as Parameters<typeof QueryManagementUtils.getRespondOrFollowupQueryData>[1];
    const result = QueryManagementUtils.getRespondOrFollowupQueryData(form, query, { id: 'user' }, 'RESPOND', 'Yes');
    expect(result.isHmctsStaff).toBeUndefined();
  });

});
