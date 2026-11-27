import { NgZone } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { Observable, Subscriber, throwError } from 'rxjs';
import { Activity, DisplayMode } from '../../projects/core-lib/case/editor-source/lib/shared/domain/activity/activity.model';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { ActivityComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/activity/activity.component';
import { ActivityPollingService } from '../../projects/core-lib/case/editor-source/lib/shared/services/activity/activity.polling.service';
import { ActivityService } from '../../projects/core-lib/case/editor-source/lib/shared/services/activity/activity.service';

export const registered = true;

describe('Activity polling migration contract', () => {
  it('keeps a later batch alive when a component from an earlier batch is destroyed', () => {
    const harness = createHarness(1);
    const first = createComponent(harness.service, 'case-a');
    const firstPoll = findPoll(harness.polls, 'case-a');
    const second = createComponent(harness.service, 'case-b');
    const secondPoll = findPoll(harness.polls, 'case-b');

    first.ngOnDestroy();

    expect(harness.polls.has(firstPoll)).toBe(false);
    expect(harness.polls.has(secondPoll)).toBe(true);
    secondPoll.subscriber.next([activity('case-b')]);
    expect(second.activity.caseId).toBe('case-b');

    second.ngOnDestroy();
    expect(harness.polls.size).toBe(0);
  });

  it('keeps a same-case subscriber alive when another component is destroyed', () => {
    const harness = createHarness(10);
    const first = createComponent(harness.service, 'case-a');
    const second = createComponent(harness.service, 'case-a');
    harness.service.flushRequests();
    const poll = findPoll(harness.polls, 'case-a');

    first.ngOnDestroy();

    expect(harness.polls.has(poll)).toBe(true);
    poll.subscriber.next([activity('case-a')]);
    expect(second.activity.caseId).toBe('case-a');

    second.ngOnDestroy();
    expect(harness.polls.size).toBe(0);
  });

  it('clears the batch collection timer when the last pending component is destroyed', () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness(10);
      const component = createComponent(harness.service, 'case-a');
      expect(vi.getTimerCount()).toBe(1);

      component.ngOnDestroy();

      expect(vi.getTimerCount()).toBe(0);
      expect(harness.polls.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts a fresh poll when a case is subscribed again after its earlier component is destroyed', () => {
    const harness = createHarness(1);
    const first = createComponent(harness.service, 'case-a');
    const firstPoll = findPoll(harness.polls, 'case-a');
    first.ngOnDestroy();
    expect(harness.polls.has(firstPoll)).toBe(false);

    const nextActivity = vi.fn();
    const second = createComponent(harness.service, 'case-a', nextActivity);
    const secondPoll = findPoll(harness.polls, 'case-a');
    expect(secondPoll).not.toBe(firstPoll);
    secondPoll.subscriber.next([activity('case-a')]);
    expect(nextActivity).toHaveBeenCalledOnce();

    second.ngOnDestroy();
    expect(harness.polls.size).toBe(0);
  });

  it('removes a terminally failed batch and allows a later subscription to recover', async () => {
    vi.useFakeTimers();
    try {
      const error = new Error('activity endpoint unavailable');
      const harness = createHarness(10, 1, 1, error);
      const subject = harness.service.subscribeToActivity('case-a', vi.fn());
      const onError = vi.fn();
      subject.subscribe({ error: onError });
      harness.service.flushRequests();
      await vi.runAllTimersAsync();

      expect(onError).toHaveBeenCalledWith(error);
      expect(subject.isStopped).toBe(true);
      expect(harness.polls.size).toBe(0);

      const onActivity = vi.fn();
      const nextSubject = harness.service.subscribeToActivity('case-a', onActivity);
      harness.service.flushRequests();
      const recoveredPoll = findPoll(harness.polls, 'case-a');
      recoveredPoll.subscriber.next([activity('case-a')]);
      expect(onActivity).toHaveBeenCalledOnce();
      nextSubject.complete();
      expect(harness.polls.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

interface Poll {
  caseIds: string[];
  subscriber: Subscriber<Activity[]>;
}

function createHarness(maxRequestsPerBatch: number, failedRequests = 0, retryAttempts = 0, failure = new Error('activity endpoint unavailable')) {
  const polls = new Set<Poll>();
  let requestCount = 0;
  const activityService = {
    isEnabled: true,
    getActivities: (...caseIds: string[]) => {
      requestCount += 1;
      if (requestCount <= failedRequests) {
        return throwError(() => failure);
      }
      return new Observable<Activity[]>(subscriber => {
        const poll = { caseIds, subscriber };
        polls.add(poll);
        return () => polls.delete(poll);
      });
    }
  };
  const config = {
    getActivityNexPollRequestMs: () => 60_000,
    getActivityRetry: () => retryAttempts,
    getActivityBatchCollectionDelayMs: () => 30_000,
    getActivityMaxRequestPerBatch: () => maxRequestsPerBatch
  };
  const zone = { run: (callback: () => unknown) => callback(), runOutsideAngular: (callback: () => unknown) => callback() };
  const service = new ActivityPollingService(activityService as unknown as ActivityService, zone as NgZone, config as AbstractAppConfig);
  Object.defineProperty(service, 'logger', { value: { error: vi.fn(), warn: vi.fn() } });
  return { service, polls };
}

function createComponent(service: ActivityPollingService, caseId: string, onActivity?: (activity: Activity) => void): ActivityComponent {
  const component = new ActivityComponent(service);
  component.caseId = caseId;
  component.displayMode = DisplayMode.ICON;
  if (onActivity) {
    vi.spyOn(component, 'onActivityChange').mockImplementation(onActivity);
  }
  component.ngOnInit();
  return component;
}

function findPoll(polls: Set<Poll>, caseId: string): Poll {
  const poll = Array.from(polls).find(candidate => candidate.caseIds.includes(caseId));
  if (!poll) throw new Error(`No active activity poll for ${caseId}`);
  return poll;
}

function activity(caseId: string): Activity {
  return { caseId, viewers: [], editors: [], unknownViewers: 0, unknownEditors: 0 };
}
