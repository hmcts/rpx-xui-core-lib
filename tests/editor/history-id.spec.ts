import { EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';
import { EventLogTableComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/history/event-log/event-log-table.component';
import { EventLogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/history/event-log/event-log.component';
import { CaseTimelineComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-timeline/case-timeline.component';
import { CaseHistoryService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-history/services/case-history.service';

export const registered = true;
describe('Case history event identifier', () => {
  it('reports and rethrows the original case history failure', () => {
    const failure = { status: 503, message: 'Unavailable' };
    const setError = jasmine.createSpy('setError');
    type Dependencies = ConstructorParameters<typeof CaseHistoryService>;
    const service = new CaseHistoryService(
      { get: () => throwError(() => failure) } as unknown as Dependencies[0],
      { setError } as unknown as Dependencies[1],
      { getCaseHistoryUrl: () => '/history' } as unknown as Dependencies[2]
    );
    let observed: unknown;
    service.get('case', 'event').subscribe({ error: error => observed = error });
    expect(setError).toHaveBeenCalledOnceWith(failure);
    expect(observed).toBe(failure);
  });
  it('preserves the Toolkit string-typed event API', () => {
    const table = new EventLogTableComponent({} as unknown as ConstructorParameters<typeof EventLogTableComponent>[0]);
    const timeline = new CaseTimelineComponent({} as unknown as ConstructorParameters<typeof CaseTimelineComponent>[0], {} as unknown as ConstructorParameters<typeof CaseTimelineComponent>[1], {} as unknown as ConstructorParameters<typeof CaseTimelineComponent>[2]);
    const events: EventEmitter<string> = table.onCaseHistory;
    timeline.caseHistoryClicked('event-id');
    const selected: string = timeline.selectedEventId;
    expect(events).toBe(table.onCaseHistory);
    expect(selected).toBe('event-id');
  });
  it('preserves numeric and string identifiers through the timeline and URL provider', () => {
    const table = new EventLogTableComponent({} as unknown as ConstructorParameters<typeof EventLogTableComponent>[0]);
    const log = new EventLogComponent();
    const timeline = new CaseTimelineComponent({} as unknown as ConstructorParameters<typeof CaseTimelineComponent>[0], {} as unknown as ConstructorParameters<typeof CaseTimelineComponent>[1], {} as unknown as ConstructorParameters<typeof CaseTimelineComponent>[2]);
    table.onCaseHistory.subscribe(id => log.caseHistoryClicked(id));
    log.onCaseHistory.subscribe(id => timeline.caseHistoryClicked(id));
    const provider = jasmine.createSpy('url').and.returnValue('/history');
    const history = new CaseHistoryService({ get: () => of({}) } as unknown as ConstructorParameters<typeof CaseHistoryService>[0], {} as unknown as ConstructorParameters<typeof CaseHistoryService>[1], { getCaseHistoryUrl: provider } as unknown as ConstructorParameters<typeof CaseHistoryService>[2]);
    for (const id of [123, 'event-id']) {
      table.caseHistoryClicked(id as unknown as string);
      expect(timeline.selectedEventId).toBe(id as unknown as string);
      history.get('case', timeline.selectedEventId).subscribe();
      expect(provider).toHaveBeenCalledWith('case', id);
    }
  });
});
