import { Subject } from 'rxjs';
import { CallbackErrorsComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/error/callback-errors.component';

export const registered = true;

describe('Callback errors lifecycle migration contract', () => {
  it('stops receiving callback errors when the component is destroyed', () => {
    const source = new Subject();
    const component = new CallbackErrorsComponent();
    component.callbackErrorsSubject = source;
    component.ngOnInit();
    const otherEvents: unknown[] = [];
    const otherSubscription = source.subscribe(event => otherEvents.push(event));
    const first = { status: 400, callbackErrors: ['first'] };
    source.next(first);
    expect(component.error).toBe(first as unknown as typeof component.error);
    (component as unknown as { ngOnDestroy(): void }).ngOnDestroy();
    source.next({ status: 400, callbackErrors: ['later'] });
    expect(component.error).toBe(first as unknown as typeof component.error);
    expect(otherEvents.length).toBe(2);
    otherSubscription.unsubscribe();
    expect(source.observed).toBeFalse();
  });
});
