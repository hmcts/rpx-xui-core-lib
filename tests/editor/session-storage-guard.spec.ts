import { describe, expect, it, vi } from 'vitest';
import { SessionStorageGuard } from '@hmcts/rpx-xui-core-lib/case/session-guard';
import { SessionStorageGuard as EditorSessionStorageGuard } from '../../projects/core-lib/case/editor-source/lib/shared/services/session/session-storage.guard';

describe('SessionStorageGuard', () => {
  it('allows navigation when user details are absent or valid JSON', () => {
    const storage = { getItem: vi.fn().mockReturnValueOnce(null).mockReturnValueOnce('{"id":"user-1"}') };
    const router = { navigate: vi.fn() };
    const guard = new SessionStorageGuard(storage as never, router as never);

    expect(guard.canActivate()).toBe(true);
    expect(guard.canActivate()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects malformed user details without logging the stored value', () => {
    const sentinel = 'SENTINEL-PRIVATE-USER-DETAILS-9384';
    const storage = { getItem: vi.fn().mockReturnValue(sentinel) };
    const router = { navigate: vi.fn() };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const guard = new SessionStorageGuard(storage as never, router as never);

    try {
      expect(guard.canActivate()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/session-error']);
      expect(consoleError.mock.calls.map(([entry]) => entry?.message)).toContain('safeJsonParse failed to parse JSON.');
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain('SENTINEL');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('uses the configured error route and logger for JSON null', () => {
    const storage = { getItem: vi.fn().mockReturnValue('null') };
    const router = { navigate: vi.fn() };
    const errorLogger = vi.fn();
    const guard = new SessionStorageGuard(storage as never, router as never, '/signed-out', errorLogger);

    expect(guard.canActivate()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/signed-out']);
    expect(errorLogger).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid userDetails in session storage' }));
  });

  it('reuses the same guard class through its editor compatibility entry', () => {
    expect(EditorSessionStorageGuard).toBe(SessionStorageGuard);
  });
});
