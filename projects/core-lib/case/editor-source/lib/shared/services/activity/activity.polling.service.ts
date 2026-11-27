import { Injectable, NgZone } from '@angular/core';
import { concat, defer, EMPTY, Observable, Subject, Subscription, timer } from 'rxjs';
import { repeat, retry, switchMap } from 'rxjs/operators';
import { AbstractAppConfig } from '../../../app.config';
import { Activity } from '../../domain/activity/activity.model';
import { StructuredLoggerService } from '../logging';
import { ActivityService } from './activity.service';

interface PollingOptions {
  interval: number;
  attempts?: number;
  exponentialUnit?: number;
}

interface ActivityBatch {
  requests: Map<string, Set<Subject<Activity>>>;
  activeSubjects: Set<Subject<Activity>>;
  subscription?: Subscription;
}

// @dynamic
@Injectable()
export class ActivityPollingService {
  private readonly logger = new StructuredLoggerService();

  private readonly pendingRequests = new Map<string, Set<Subject<Activity>>>();
  private currentTimeoutHandle: ReturnType<typeof setTimeout> | undefined;
  private readonly activeBatches = new Set<ActivityBatch>();
  private readonly pollConfig: PollingOptions;
  private readonly batchCollectionDelayMs: number;
  private readonly maxRequestsPerBatch: number;

  constructor(private readonly activityService: ActivityService, private readonly ngZone: NgZone, config: AbstractAppConfig) {
    this.pollConfig = {
      interval: config.getActivityNexPollRequestMs(),
      attempts: config.getActivityRetry()
    };
    this.batchCollectionDelayMs = config.getActivityBatchCollectionDelayMs();
    this.maxRequestsPerBatch = config.getActivityMaxRequestPerBatch();
  }

  public get isEnabled(): boolean {
    return this.activityService.isEnabled;
  }

  public subscribeToActivity(caseId: string, done: (activity: Activity) => void): Subject<Activity> {
    if (!this.isEnabled) {
      return new Subject<Activity>();
    }

    const subject = new Subject<Activity>();
    // The row has no error UI; the service logs terminal polling failures below.
    subject.subscribe({ next: done, error: () => undefined });
    this.addPendingRequest(caseId, subject);

    if (this.pendingRequests.size >= this.maxRequestsPerBatch) {
      this.flushRequests();
    }
    return subject;
  }

  public stopPolling(): void {
    Array.from(this.activeBatches).forEach(batch => this.stopBatch(batch));
  }

  public flushRequests(): void {
    if (this.currentTimeoutHandle) {
      clearTimeout(this.currentTimeoutHandle);
      this.currentTimeoutHandle = undefined;
    }

    if (!this.pendingRequests.size) {
      return;
    }

    const requests = new Map(Array.from(this.pendingRequests, ([caseId, subjects]) => [caseId, new Set(subjects)]));
    this.pendingRequests.clear();
    this.performBatchRequest(requests);
  }

  public pollActivities(...caseIds: string[]): Observable<Activity[]> {
    if (!this.isEnabled) {
      return EMPTY;
    }

    return this.polling(this.activityService.getActivities(...caseIds), this.pollConfig);
  }

  public postViewActivity(caseId: string): Observable<Activity[]> {
    return this.postActivity(caseId, ActivityService.ACTIVITY_VIEW);
  }

  public postEditActivity(caseId: string): Observable<Activity[]> {
    return this.postActivity(caseId, ActivityService.ACTIVITY_EDIT);
  }

  protected performBatchRequest(requests: Map<string, Set<Subject<Activity>>>): void {
    const caseIds = Array.from(requests.keys()).join();
    const batch: ActivityBatch = {
      requests,
      activeSubjects: new Set(Array.from(requests.values()).flatMap(subjects => Array.from(subjects)))
    };
    this.activeBatches.add(batch);
    this.ngZone.runOutsideAngular( () => {
      // run polling outside angular zone so it does not trigger change detection
      batch.subscription = this.pollActivities(caseIds).subscribe({
        // process activity inside zone so it triggers change detection for activity.component.ts
        next: (activities: Activity[]) => this.ngZone.run(() => {
          activities.forEach((activity) => {
            // Ignore activities returned for cases outside this local batch.
            requests.get(activity.caseId)?.forEach(subject => {
              if (batch.activeSubjects.has(subject)) {
                subject.next(activity);
              }
            });
          });
        }),
        error: (err) => this.ngZone.run(() => {
          this.logger.error('Error while polling activities.', { error: err });
          Array.from(batch.activeSubjects).forEach(subject => subject.error(err));
        })
      });
      if (!batch.activeSubjects.size) {
        this.stopBatch(batch);
      }
    });
  }

  private postActivity(caseId: string, activityType: string): Observable<Activity[]> {
    if (!this.isEnabled) {
      return EMPTY;
    }

    const pollingConfig: PollingOptions = {
      ...this.pollConfig,
      interval: 5000 // inline with CCD Backend
    };

    return this.polling(this.activityService.postActivity(caseId, activityType), pollingConfig);
  }

  private addPendingRequest(caseId: string, subject: Subject<Activity>): void {
    const wasEmpty = this.pendingRequests.size === 0;
    let subjects = this.pendingRequests.get(caseId);
    if (!subjects) {
      subjects = new Set<Subject<Activity>>();
      this.pendingRequests.set(caseId, subjects);
    }
    subjects.add(subject);

    // Each component owns its Subject, even when several rows show the same case.
    subject.subscribe({
      complete: () => this.removePendingRequest(caseId, subject),
      error: () => this.removePendingRequest(caseId, subject)
    });

    if (wasEmpty) {
      this.ngZone.runOutsideAngular(() => {
        this.currentTimeoutHandle = setTimeout(
          () => this.ngZone.run(() => {
            this.flushRequests();
          }),
          this.batchCollectionDelayMs);
      });
    }
  }

  private removePendingRequest(caseId: string, subject: Subject<Activity>): void {
    const subjects = this.pendingRequests.get(caseId);
    if (subjects?.delete(subject) && !subjects.size) {
      this.pendingRequests.delete(caseId);
    }

    if (!this.pendingRequests.size && this.currentTimeoutHandle) {
      clearTimeout(this.currentTimeoutHandle);
      this.currentTimeoutHandle = undefined;
    }

    this.activeBatches.forEach(batch => {
      batch.activeSubjects.delete(subject);
      if (!batch.activeSubjects.size) {
        this.stopBatch(batch);
      }
    });
  }

  private stopBatch(batch: ActivityBatch): void {
    batch.subscription?.unsubscribe();
    this.activeBatches.delete(batch);
  }

  private polling<T>(request$: Observable<T>, options: PollingOptions): Observable<T> {
    const pollingOptions = {
      interval: options.interval,
      attempts: options.attempts ?? 9,
      exponentialUnit: options.exponentialUnit ?? 1000
    };

    return concat(
      request$,
      defer(() => timer(pollingOptions.interval).pipe(switchMap(() => request$))).pipe(repeat())
    ).pipe(
      // Preserve consecutive-failure retry behaviour using the current RxJS retry config.
      retry({
        count: pollingOptions.attempts,
        delay: (_error, retryCount) => timer(this.getExponentialRetryDelay(retryCount, pollingOptions.exponentialUnit)),
        resetOnSuccess: true
      })
    );
  }

  private getExponentialRetryDelay(consecutiveErrorsCount: number, exponentialUnit: number): number {
    return Math.pow(2, consecutiveErrorsCount - 1) * exponentialUnit;
  }
}
