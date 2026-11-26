import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LDClient } from 'launchdarkly-js-client-sdk';
import { LAUNCH_DARKLY_INITIALIZE, LaunchDarklyService } from '../../../projects/core-lib/ui/launch-darkly/launch-darkly.service';

type Listener = (value?: unknown) => void;
type InitializeClient = typeof import('launchdarkly-js-client-sdk').initialize;
const loggedIn = (key: string) => ({ key, roles: ['caseworker'], orgId: 'org-1' });

function client() {
  const listeners = new Map<string, Set<Listener>>();
  const values = new Map<string, unknown>();
  const instance = {
    on: vi.fn((event: string, listener: Listener) => {
      const eventListeners = listeners.get(event) ?? new Set<Listener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    }),
    off: vi.fn((event: string, listener: Listener) => listeners.get(event)?.delete(listener)),
    identify: vi.fn(async () => undefined),
    variation: vi.fn((name: string, fallback: unknown) => values.has(name) ? values.get(name) : fallback),
    close: vi.fn(async () => undefined),
    emit(event: string, value?: unknown) {
      for (const listener of listeners.get(event) ?? []) listener(value);
    },
    set(name: string, value: unknown) { values.set(name, value); }
  };
  return instance;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function factoryFor(...clients: ReturnType<typeof client>[]): InitializeClient {
  return vi.fn(() => clients.shift() as unknown as LDClient) as unknown as InitializeClient;
}

describe('LaunchDarklyService', () => {
  it('resolves the SDK factory from the Angular injection token', () => {
    const sdk = client();
    const createClient = factoryFor(sdk);
    TestBed.configureTestingModule({ providers: [{ provide: LAUNCH_DARKLY_INITIALIZE, useValue: createClient }] });
    const service = TestBed.inject(LaunchDarklyService);

    service.initialize({ anonymous: true }, 'client-id');

    expect(createClient).toHaveBeenCalledWith('client-id', { kind: 'user', anonymous: true }, { useReport: true });
  });

  it('uses the anonymous context when the caller passes no user', () => {
    const sdk = client();
    const createClient = factoryFor(sdk);
    const service = new LaunchDarklyService(createClient);

    service.initialize(undefined, 'client-id');

    expect(createClient).toHaveBeenCalledWith('client-id', { kind: 'user', anonymous: true }, { useReport: true });
  });

  it('uses the current context, emits defaults then live values, and observes flag changes', async () => {
    const sdk = client();
    sdk.set('enabled', true);
    sdk.set('roles', ['caseworker-civil']);
    const createClient = factoryFor(sdk);
    const service = new LaunchDarklyService(createClient);
    const enabled: boolean[] = [];
    service.isEnabled('enabled').subscribe((value: boolean) => enabled.push(value));
    service.getValue('roles', []).subscribe((value: unknown[]) => enabled.push(value.length > 0));
    const rolesOnce = firstValueFrom(service.getValueOnce('roles', []));

    service.initialize({ key: 'user-1', roles: ['caseworker-civil'], orgId: 'org-1' }, 'client-id');
    expect(createClient).toHaveBeenCalledWith('client-id', {
      kind: 'user', key: 'user-1', roles: ['caseworker-civil'], orgId: 'org-1'
    }, { useReport: true });
    sdk.emit('ready');
    await Promise.resolve();

    expect(await rolesOnce).toEqual(['caseworker-civil']);
    expect(sdk.identify).not.toHaveBeenCalled();
    expect(enabled).toEqual([false, false, true, true]);
    sdk.emit('change:enabled', false);
    expect(enabled.at(-1)).toBe(false);
    expect(service.getValueSync('enabled', false)).toBe(true);
  });

  it('re-identifies one SDK client and ignores completion from an older identity request', async () => {
    const sdk = client();
    const stale = deferred<void>();
    const current = deferred<void>();
    sdk.identify.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise);
    const createClient = factoryFor(sdk);
    const service = new LaunchDarklyService(createClient);
    service.initialize(loggedIn('user-1'), 'client-id');
    sdk.emit('ready');
    await Promise.resolve();

    service.initialize(loggedIn('user-2'), 'client-id');
    service.initialize(loggedIn('user-3'), 'client-id');
    const result = firstValueFrom(service.getValueOnce('roles', 'default'));
    stale.resolve();
    await Promise.resolve();
    expect(sdk.identify).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledTimes(1);

    sdk.set('roles', 'current-user-value');
    current.resolve();
    await Promise.resolve();
    expect(await result).toBe('current-user-value');
  });

  it('getValueOnce completes after its first ready value', async () => {
    const sdk = client();
    const service = new LaunchDarklyService(factoryFor(sdk));
    service.initialize({ anonymous: true }, 'client-id');
    sdk.emit('ready');
    await Promise.resolve();

    const values: unknown[] = [];
    let completed = false;
    service.getValueOnce('roles', 'default').subscribe({
      next: value => values.push(value),
      complete: () => { completed = true; }
    });
    service.initialize({ anonymous: true }, 'client-id');
    expect(values).toEqual(['default']);
    expect(completed).toBe(true);
  });

  it('closes the old client when the client ID changes and ignores its late events', async () => {
    const first = client();
    const second = client();
    const createClient = factoryFor(first, second);
    const service = new LaunchDarklyService(createClient);
    const values: boolean[] = [];
    service.isEnabled('enabled').subscribe((value: boolean) => values.push(value));
    service.initialize({ anonymous: true }, 'first-client');
    first.emit('ready');
    await Promise.resolve();
    service.initialize({ anonymous: true }, 'second-client');
    expect(first.close).toHaveBeenCalledOnce();
    first.emit('error', new Error('old client failure'));
    second.emit('ready');
    await Promise.resolve();
    expect(values.at(-1)).toBe(false);
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it('returns the safe default when re-identification fails instead of exposing old-context flags', async () => {
    const sdk = client();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    sdk.set('enabled', true);
    sdk.identify.mockRejectedValueOnce(new Error('identify failed'));
    const service = new LaunchDarklyService(factoryFor(sdk));
    service.initialize(loggedIn('user-1'), 'client-id');
    sdk.emit('ready');
    await Promise.resolve();

    const values: boolean[] = [];
    service.isEnabled('enabled').subscribe((flag: boolean) => values.push(flag));
    service.initialize(loggedIn('user-2'), 'client-id');
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith('LaunchDarkly client network error:', expect.any(Error)));

    expect(values.at(-1)).toBe(false);
    consoleError.mockRestore();
  });

  it('fails closed when the SDK errors during identity change, even if identify later resolves', async () => {
    const sdk = client();
    const pending = deferred<void>();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    sdk.set('enabled', true);
    sdk.identify.mockReturnValueOnce(pending.promise);
    const service = new LaunchDarklyService(factoryFor(sdk));
    service.initialize({ anonymous: true }, 'client-id');
    sdk.emit('ready');
    await Promise.resolve();

    const values: boolean[] = [];
    service.isEnabled('enabled').subscribe((value: boolean) => values.push(value));
    service.initialize(loggedIn('user-2'), 'client-id');
    sdk.emit('error', new Error('network unavailable'));
    pending.resolve();
    await Promise.resolve();

    expect(values.at(-1)).toBe(false);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('closes its client and ignores pending identify work when destroyed', async () => {
    const sdk = client();
    const pending = deferred<void>();
    sdk.identify.mockReturnValueOnce(pending.promise);
    const service = new LaunchDarklyService(factoryFor(sdk));
    service.initialize({ anonymous: true }, 'client-id');
    sdk.emit('ready');
    await Promise.resolve();
    service.initialize(loggedIn('user-2'), 'client-id');

    service.ngOnDestroy();
    pending.resolve();
    await Promise.resolve();

    expect(sdk.close).toHaveBeenCalledOnce();
    expect(service.getValueSync('enabled', false)).toBe(false);
  });
});
