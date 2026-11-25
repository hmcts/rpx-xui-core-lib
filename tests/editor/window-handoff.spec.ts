import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { WindowService } from '../../projects/core-lib/case/editor-source/lib/shared/services/window/window.service';

export const registered = true;

describe('Media viewer handoff', () => {
  const token = 'synthetic-token';
  let child: { closed: boolean; opener: Window | null; postMessage: Mock };

  beforeEach(() => {
    vi.useFakeTimers();
    child = { closed: false, opener: window, postMessage: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(child as unknown as Window);
  });
  afterEach(() => vi.useRealTimers());

  function acknowledge(origin: string, source: unknown, receivedToken: string) {
    const event = new Event('message');
    Object.defineProperties(event, {
      origin: { value: origin }, source: { value: source },
      data: { value: { type: 'MEDIA_VIEWER_HANDOFF_RECEIVED', token: receivedToken } }
    });
    window.dispatchEvent(event);
  }

  it('does not register a listener when the popup is blocked', () => {
    (window.open as Mock).mockReturnValue(null);
    const add = vi.spyOn(window, 'addEventListener');
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    expect(add).not.toHaveBeenCalled();
  });

  it('sends to the current origin and stops after the matching acknowledgement', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    expect(child.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'MEDIA_VIEWER_HANDOFF', token, payload: 'synthetic' }, window.location.origin);
    acknowledge(window.location.origin, child, token);
    expect(child.opener).toBeNull();
    expect(remove).toHaveBeenCalledWith('message', expect.any(Function));
    vi.advanceTimersByTime(500);
    expect(child.postMessage).toHaveBeenCalledTimes(1);
  });

  it('ignores acknowledgements from the wrong origin, window or token', () => {
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    acknowledge('https://wrong.example', child, token);
    acknowledge(window.location.origin, window, token);
    acknowledge(window.location.origin, child, 'wrong');
    vi.advanceTimersByTime(100);
    expect(child.postMessage).toHaveBeenCalledTimes(2);
    expect(child.opener).toBe(window);
    acknowledge(window.location.origin, child, token);
    expect(child.opener).toBeNull();
  });

  it('stops retrying when the viewer window closes', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    child.closed = true;
    vi.advanceTimersByTime(100);
    expect(child.postMessage).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('message', expect.any(Function));
    vi.advanceTimersByTime(500);
    expect(child.postMessage).toHaveBeenCalledTimes(1);
  });

  it('stops retrying and releases the opener after the retry limit', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    new WindowService().openOnNewTabWithMessage('/viewer', 'synthetic', token);
    vi.advanceTimersByTime(10_000);
    expect(child.postMessage).toHaveBeenCalledTimes(100);
    expect(child.opener).toBeNull();
    expect(remove).toHaveBeenCalledWith('message', expect.any(Function));
    vi.advanceTimersByTime(500);
    expect(child.postMessage).toHaveBeenCalledTimes(100);
  });
});
