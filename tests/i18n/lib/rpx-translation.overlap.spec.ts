import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { db } from '../../../projects/core-lib/i18n/lib/db';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';

afterEach(() => vi.useRealTimers());

type Reply = { translations: Record<string, string> };
type Request = { body: { phrases: string[] }; reply: Subject<Reply> };

const notice = 'Notice of charge';
const hearing = 'Hearing date';
const welshNotice = 'Hysbysiad o arwystl';
const welshHearing = 'Dyddiad y gwrandawiad';
const debounceMs = 20;

describe('RpxTranslationService overlapping batches', () => {
  let service: RpxTranslationService;
  let requests: Request[];
  let subscriptions: Subscription[];
  let writes: MockInstance<typeof db.translations.bulkAdd>;

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    requests = [];
    subscriptions = [];
    vi.spyOn(db.translations, 'where').mockReturnValue({
      equals: () => ({ last: () => Promise.resolve(undefined) })
    } as unknown as ReturnType<typeof db.translations.where>);
    writes = vi.spyOn(db.translations, 'bulkAdd').mockImplementation(() => undefined as never);
    const post = vi.fn().mockImplementation((_url: string, body: { phrases: string[] }) => {
      const reply = new Subject<Reply>();
      requests.push({ body: structuredClone(body), reply });
      return reply;
    });
    service = new RpxTranslationService(
      { baseUrl: '/translations', debounceTimeMs: debounceMs, validity: { days: 1 }, testMode: false },
      { post } as unknown as HttpClient
    );
    service.language = 'cy';
  });

  afterEach(() => {
    service.language = 'en';
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    requests.forEach((request) => request.reply.complete());
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
  });

  for (const outcome of ['success', 'failure']) {
    it(`keeps a queued second batch after an in-flight ${outcome}`, async () => {
    vi.useFakeTimers();
      const first: string[] = [];
      const alias: string[] = [];
      const second: string[] = [];
      subscriptions.push(service.getTranslation$(notice).subscribe((value) => first.push(value)));
      await vi.advanceTimersByTimeAsync(debounceMs);
      expect(requests.length).toBe(1);
      expect(requests[0].body).toEqual({ phrases: [notice] });
      subscriptions.push(service.getTranslation$('Notice  of charge').subscribe((value) => alias.push(value)));
      subscriptions.push(service.getTranslation$(hearing).subscribe((value) => second.push(value)));
      await vi.advanceTimersByTimeAsync(debounceMs / 2);
      expect(second.at(-1)).toBe(`${hearing} [Translation in progress]`);
      if (outcome === 'success') {
        requests[0].reply.next({ translations: { [notice]: welshNotice } });
      } else {
        requests[0].reply.error(new HttpErrorResponse({ status: 500 }));
      }
      expect(first.at(-1)).toBe(outcome === 'success' ? welshNotice : notice);
      expect(alias.at(-1)).toBe(outcome === 'success' ? welshNotice : notice);
      expect(second.at(-1)).toBe(`${hearing} [Translation in progress]`);
      if (outcome === 'success') {
        expect(writes.mock.lastCall![0].map(translation => translation.phrase)).toEqual([notice]);
      } else {
        expect(writes).not.toHaveBeenCalled();
      }
      await vi.advanceTimersByTimeAsync(debounceMs / 2);
      expect(requests.length).toBe(2);
      expect(requests[1].body).toEqual({ phrases: [hearing] });
      requests[1].reply.next({ translations: { [hearing]: welshHearing } });
      expect(second.at(-1)).toBe(welshHearing);
      expect(requests.length).toBe(2);
    });
  }

  for (const outcome of ['success', 'failure']) {
    it(`keeps dispatched batches independent when the second finishes before the first ${outcome}`, async () => {
    vi.useFakeTimers();
      const first: string[] = [];
      const alias: string[] = [];
      const second: string[] = [];
      subscriptions.push(service.getTranslation$(notice).subscribe((value) => first.push(value)));
      await vi.advanceTimersByTimeAsync(debounceMs);
      subscriptions.push(service.getTranslation$(hearing).subscribe((value) => second.push(value)));
      await vi.advanceTimersByTimeAsync(debounceMs);
      expect(requests.length).toBe(2);
      expect(requests[0].body).toEqual({ phrases: [notice] });
      expect(requests[1].body).toEqual({ phrases: [hearing] });
      subscriptions.push(service.getTranslation$('Notice  of charge').subscribe((value) => alias.push(value)));
      await vi.advanceTimersByTimeAsync(debounceMs);
      expect(requests.length).toBe(2);
      requests[1].reply.next({ translations: { [hearing]: welshHearing } });
      expect(second.at(-1)).toBe(welshHearing);
      expect(first.at(-1)).toBe(`${notice} [Translation in progress]`);
      if (outcome === 'success') {
        requests[0].reply.next({ translations: { [notice]: welshNotice } });
      } else {
        requests[0].reply.error(new HttpErrorResponse({ status: 500 }));
      }
      expect(first.at(-1)).toBe(outcome === 'success' ? welshNotice : notice);
      expect(alias.at(-1)).toBe(outcome === 'success' ? welshNotice : notice);
      expect(second.at(-1)).toBe(welshHearing);
      expect(writes.mock.lastCall![0].map(translation => translation.phrase)).toEqual(outcome === 'success' ? [notice] : [hearing]);
      expect(requests.length).toBe(2);
    });
  }

});
