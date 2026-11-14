import { SimpleChange } from '@angular/core';
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
});
