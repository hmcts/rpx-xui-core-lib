import { Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { initialize, LDClient, LDContext } from 'launchdarkly-js-client-sdk';
import { BehaviorSubject, distinctUntilChanged, filter, map, Observable, take } from 'rxjs';
import { FeatureToggleService } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';
import type { FeatureUser } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';

export const LAUNCH_DARKLY_INITIALIZE = new InjectionToken<typeof initialize>(
  'LAUNCH_DARKLY_INITIALIZE',
  { providedIn: 'root', factory: () => initialize }
);

@Injectable({ providedIn: 'root' })
export class LaunchDarklyService implements FeatureToggleService, OnDestroy {
  private client?: LDClient;
  private clientId?: string;
  private generation = 0;
  private identityActive = false;
  private identityInFlight = false;
  private readonly ready = new BehaviorSubject<boolean>(false);
  private readonly features = new Map<string, BehaviorSubject<unknown>>();
  private readonly defaults = new Map<string, unknown>();
  private readonly featureListeners = new Map<string, (value?: unknown) => void>();

  constructor(@Inject(LAUNCH_DARKLY_INITIALIZE) private readonly createClient: typeof initialize) {}

  public ngOnDestroy(): void {
    ++this.generation;
    this.identityActive = false;
    this.identityInFlight = false;
    this.ready.next(false);
    this.resetFeatureValues();
    if (this.client) this.closeClient(this.client);
    this.client = undefined;
    this.clientId = undefined;
  }

  public initialize(user: FeatureUser = { anonymous: true }, clientId: string): void {
    const context: LDContext = { kind: 'user', ...user };
    const generation = ++this.generation;
    this.ready.next(false);

    if (this.client && this.clientId === clientId) {
      const client = this.client;
      this.identityActive = false;
      this.identityInFlight = true;
      this.resetFeatureValues();
      void client.identify(context).then(() => {
        if (!this.isCurrent(client, generation)) return;
        this.identityInFlight = false;
        this.identityActive = true;
        this.refreshFeatureValues(client);
        this.ready.next(true);
      }).catch(error => this.handleIdentifyFailure(client, generation, error));
      return;
    }

    if (this.client) this.closeClient(this.client);

    const client = this.createClient(clientId, context, { useReport: true });
    this.client = client;
    this.clientId = clientId;
    this.identityActive = true;
    this.identityInFlight = false;
    this.listenForFeatureChanges(client);

    client.on('ready', () => {
      if (this.client !== client || this.identityInFlight) return;
      this.refreshFeatureValues(client);
      this.ready.next(true);
    });
    client.on('error', error => {
      if (this.client !== client) return;
      console.error('LaunchDarkly client network error:', error);
      if (this.identityInFlight) {
        ++this.generation;
        this.identityInFlight = false;
        this.identityActive = false;
        this.resetFeatureValues();
      }
      this.ready.next(true);
    });
  }

  public isEnabled(feature: string, defaultValue = false): Observable<boolean> {
    return this.getValue(feature, defaultValue);
  }

  public getArray<R = unknown>(feature: string): Observable<R[]> {
    return this.getValue<R[]>(feature, []);
  }

  public getValue<R>(feature: string, defaultValue: R): Observable<R> {
    let state = this.features.get(feature);
    if (!state) {
      state = new BehaviorSubject<unknown>(defaultValue);
      this.features.set(feature, state);
      this.defaults.set(feature, defaultValue);
      if (this.client) this.listenForFeatureChange(this.client, feature, state);
      if (this.client && this.ready.value && this.identityActive) {
        state.next(this.client.variation(feature, defaultValue) as R);
      }
    }
    return state.pipe(distinctUntilChanged()) as Observable<R>;
  }

  public getValueOnce<R>(feature: string, defaultValue: R): Observable<R> {
    return this.ready.pipe(
      filter(ready => ready),
      map(() => this.client && this.identityActive
        ? this.client.variation(feature, defaultValue) as R
        : defaultValue),
      take(1)
    );
  }

  public getValueSync<R>(feature: string, defaultValue: R): R {
    return this.client && this.identityActive
      ? this.client.variation(feature, defaultValue) as R
      : defaultValue;
  }

  private listenForFeatureChanges(client: LDClient): void {
    for (const [feature, state] of this.features) this.listenForFeatureChange(client, feature, state);
  }

  private listenForFeatureChange(client: LDClient, feature: string, state: BehaviorSubject<unknown>): void {
    if (this.featureListeners.has(feature)) return;
    const listener = (value?: unknown): void => {
      if (this.client === client && this.identityActive) state.next(value);
    };
    this.featureListeners.set(feature, listener);
    client.on(`change:${feature}`, listener);
  }

  private refreshFeatureValues(client: LDClient): void {
    for (const [feature, state] of this.features) {
      state.next(client.variation(feature, this.defaults.get(feature)));
    }
  }

  private resetFeatureValues(): void {
    for (const [feature, state] of this.features) state.next(this.defaults.get(feature));
  }

  private handleIdentifyFailure(client: LDClient, generation: number, error: unknown): void {
    if (!this.isCurrent(client, generation)) return;
    this.identityInFlight = false;
    this.identityActive = false;
    this.resetFeatureValues();
    console.error('LaunchDarkly client network error:', error);
    this.ready.next(true);
  }

  private closeClient(client: LDClient): void {
    for (const [feature, listener] of this.featureListeners) client.off(`change:${feature}`, listener);
    this.featureListeners.clear();
    void client.close().catch(error => console.error('LaunchDarkly client close failed:', error));
  }

  private isCurrent(client: LDClient, generation: number): boolean {
    return this.client === client && this.generation === generation;
  }
}
