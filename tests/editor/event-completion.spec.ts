import { SimpleChange } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { CaseEditWizardGuard } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case-edit-wizard.guard';
import { CaseEventCompletionComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-event-completion/case-event-completion.component';
import { CaseEditComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit/case-edit.component';
import { CLIENT_CONTEXT_KEY } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/domain/client-context-key';
import { removeTaskFromClientContext } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/case-edit-utils/case-edit.utils';

export const registered = true;

describe('Event completion migration contract', () => {
  it('retains the existing client context storage key', () => {
    expect(CaseEditComponent.CLIENT_CONTEXT).toBe('clientContext');
    expect(CLIENT_CONTEXT_KEY).toBe(CaseEditComponent.CLIENT_CONTEXT);
  });
  it('removes only the user task from client context', () => {
    const storage = { getItem: jasmine.createSpy('get').and.returnValue(JSON.stringify({ client_context: { user_task: { id: 'task' }, other: 'keep' }, top: 1 })), setItem: jasmine.createSpy('set') };
    removeTaskFromClientContext(storage as unknown as Parameters<typeof removeTaskFromClientContext>[0]);
    expect(storage.getItem).toHaveBeenCalledOnceWith('clientContext');
    expect(storage.setItem).toHaveBeenCalledOnceWith('clientContext', JSON.stringify({ client_context: { other: 'keep' }, top: 1 }));
  });
  it('initialises the state machine and emits only a non-completable result', () => {
    const machine = {};
    const service = { initialiseStateMachine: jasmine.createSpy().and.returnValue(machine), createStates: jasmine.createSpy(), addTransitions: jasmine.createSpy(), startStateMachine: jasmine.createSpy() };
    const component = new CaseEventCompletionComponent(service as unknown as ConstructorParameters<typeof CaseEventCompletionComponent>[0], {} as unknown as ConstructorParameters<typeof CaseEventCompletionComponent>[1], {} as unknown as ConstructorParameters<typeof CaseEventCompletionComponent>[2], {} as unknown as ConstructorParameters<typeof CaseEventCompletionComponent>[3], {} as unknown as ConstructorParameters<typeof CaseEventCompletionComponent>[4], {} as unknown as ConstructorParameters<typeof CaseEventCompletionComponent>[5]);
    component.eventCompletionParams = { task: {}, caseId: '123', eventId: 'event' } as unknown as typeof component.eventCompletionParams;
    const received: boolean[] = [];
    component.eventCanBeCompleted.subscribe(value => received.push(value));
    component.ngOnChanges({ eventCompletionParams: new SimpleChange(undefined, component.eventCompletionParams, true) });
    expect(service.createStates).toHaveBeenCalledWith(machine);
    expect(service.startStateMachine).toHaveBeenCalledWith(machine);
    component.setEventCanBeCompleted(true);
    component.setEventCanBeCompleted(false);
    expect(received).toEqual([false]);
  });
  it('reports a failed wizard redirect without delaying resolution', async () => {
    const failure = new Error('Synthetic navigation failure');
    const navigation = Promise.reject(failure);
    navigation.catch(() => {});
    const router = { navigate: jasmine.createSpy('navigate').and.returnValue(navigation) };
    const events = new Subject<unknown>();
    const trigger = { hasFields: () => false, hasPages: () => false };
    const eventService = { eventTriggerSource: events, announceEventTrigger: () => events.next(trigger) };
    type Dependencies = ConstructorParameters<typeof CaseEditWizardGuard>;
    const handler = { handleError: jasmine.createSpy('handleError') };
    const guard = new CaseEditWizardGuard(router as unknown as Router, { getUrlSegmentsFromRoot: () => ['case'] } as unknown as Dependencies[1], {} as Dependencies[2], {} as Dependencies[3], eventService as unknown as Dependencies[4], handler);
    const route = { parent: { data: { eventTrigger: trigger } }, queryParams: {} } as unknown as ActivatedRouteSnapshot;
    await expectAsync(guard.resolve(route)).toBeResolvedTo(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(router.navigate).toHaveBeenCalledOnceWith(['case', 'submit'], { queryParams: {} });
    expect(handler.handleError).toHaveBeenCalledOnceWith(failure);
  });

  it('preserves first-page navigation and the invalid-page alert', async () => {
    const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
    const events = new Subject<unknown>();
    const trigger = { hasFields: () => true, hasPages: () => true, case_fields: [] as never[] };
    const eventService = { eventTriggerSource: events, announceEventTrigger: () => events.next(trigger) };
    const wizard = { firstPage: () => ({ id: 'first' }), hasPage: () => false };
    const alert = { error: jasmine.createSpy('error') };
    type Dependencies = ConstructorParameters<typeof CaseEditWizardGuard>;
    const guard = new CaseEditWizardGuard(router as unknown as Router, { getUrlSegmentsFromRoot: () => ['case'] } as unknown as Dependencies[1], { create: () => wizard } as unknown as Dependencies[2], alert as unknown as Dependencies[3], eventService as unknown as Dependencies[4]);
    const route = { parent: { data: { eventTrigger: trigger } }, params: { page: 'missing' }, queryParams: { test: 'value' } } as unknown as ActivatedRouteSnapshot;
    await expectAsync(guard.resolve(route)).toBeResolvedTo(true);
    await Promise.resolve();
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate.calls.mostRecent().args[0]).toEqual(['case', 'first']);
    expect(router.navigate.calls.mostRecent().args[1].queryParams).toEqual({ test: 'value' });
    expect(alert.error).toHaveBeenCalledOnceWith({ phrase: 'No page could be found for %PAGEID%', replacements: { PAGEID: 'missing' } });
  });

});
