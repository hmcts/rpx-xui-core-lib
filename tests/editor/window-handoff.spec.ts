import { fakeAsync, tick } from '@angular/core/testing';
import { WindowService } from '../../projects/core-lib/case/editor-source/lib/shared/services/window/window.service';

export const registered = true;

describe('Media viewer handoff', () => {
  const token = 'synthetic-token';
  let child: { closed: boolean; opener: Window | null; postMessage: jasmine.Spy };

  beforeEach(() => {
    child = { closed: false, opener: window, postMessage: jasmine.createSpy('postMessage') };
    spyOn(window, 'open').and.returnValue(child as unknown as Window);
  });

  function acknowledge(origin: string, source: unknown, receivedToken: string) {
    const event = new Event('message');
    Object.defineProperties(event, {
      origin: { value: origin }, source: { value: source },
      data: { value: { type: 'MEDIA_VIEWER_HANDOFF_RECEIVED', token: receivedToken } }
    });
    window.dispatchEvent(event);
  }

  it('does not register a listener when the popup is blocked', () => {
    (window.open as jasmine.Spy).and.returnValue(null);
    const add = spyOn(window, 'addEventListener').and.callThrough();
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    expect(add).not.toHaveBeenCalled();
  });

  it('sends to the current origin and stops after the matching acknowledgement', fakeAsync(() => {
    const remove = spyOn(window, 'removeEventListener').and.callThrough();
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    expect(child.postMessage).toHaveBeenCalledOnceWith({ type: 'MEDIA_VIEWER_HANDOFF', token, payload: 'synthetic' }, window.location.origin);
    acknowledge(window.location.origin, child, token);
    expect(child.opener).toBeNull();
    expect(remove).toHaveBeenCalledWith('message', jasmine.any(Function));
    tick(500);
    expect(child.postMessage).toHaveBeenCalledTimes(1);
  }));

  it('ignores acknowledgements from the wrong origin, window or token', fakeAsync(() => {
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    acknowledge('https://wrong.example', child, token);
    acknowledge(window.location.origin, window, token);
    acknowledge(window.location.origin, child, 'wrong');
    tick(100);
    expect(child.postMessage).toHaveBeenCalledTimes(2);
    expect(child.opener).toBe(window);
    acknowledge(window.location.origin, child, token);
    expect(child.opener).toBeNull();
  }));

  it('stops retrying when the viewer window closes', fakeAsync(() => {
    const remove = spyOn(window, 'removeEventListener').and.callThrough();
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    child.closed = true;
    tick(100);
    expect(child.postMessage).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('message', jasmine.any(Function));
    tick(500);
    expect(child.postMessage).toHaveBeenCalledTimes(1);
  }));

  it('stops retrying and releases the opener after the retry limit', fakeAsync(() => {
    const remove = spyOn(window, 'removeEventListener').and.callThrough();
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    tick(10_000);
    expect(child.postMessage).toHaveBeenCalledTimes(100);
    expect(child.opener).toBeNull();
    expect(remove).toHaveBeenCalledWith('message', jasmine.any(Function));
    tick(500);
    expect(child.postMessage).toHaveBeenCalledTimes(100);
  }));
});
