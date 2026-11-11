import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { Subject, Subscription } from 'rxjs';
import { db } from '../../../projects/core-lib/i18n/lib/db';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';

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
  let writes: jasmine.Spy;

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    requests = [];
    subscriptions = [];
    spyOn(db.translations, 'where').and.returnValue({
      equals: () => ({ last: () => Promise.resolve(undefined) })
    } as unknown as ReturnType<typeof db.translations.where>);
    writes = spyOn(db.translations, 'bulkAdd').and.stub();
    const post = jasmine.createSpy('post').and.callFake((_url: string, body: { phrases: string[] }) => {
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
    it(`keeps a queued second batch after an in-flight ${outcome}`, fakeAsync(() => {
      const first: string[] = [];
      const alias: string[] = [];
      const second: string[] = [];
      subscriptions.push(service.getTranslation$(notice).subscribe((value) => first.push(value)));
      tick(debounceMs);
      expect(requests.length).toBe(1);
      expect(requests[0].body).toEqual({ phrases: [notice] });
      subscriptions.push(service.getTranslation$('Notice  of charge').subscribe((value) => alias.push(value)));
      subscriptions.push(service.getTranslation$(hearing).subscribe((value) => second.push(value)));
      tick(debounceMs / 2);
      expect(second.at(-1)).toBe(`${hearing} [Translation in progress]`);
      if (outcome === 'success') {
        requests[0].reply.next({ translations: { [notice]: welshNotice } });
      } else {
        requests[0].reply.error(new HttpErrorResponse({ status: 500 }));
      }
      expect(first.at(-1)).toBe(outcome === 'success' ? welshNotice : notice);
      expect(alias.at(-1)).toBe(outcome === 'success' ? welshNotice : notice);
      expect(second.at(-1)).toBe(`${hearing} [Translation in progress]`);
      expect(writes.calls.mostRecent().args[0].map((translation: { phrase: string }) => translation.phrase)).toEqual([notice]);
      tick(debounceMs / 2);
      expect(requests.length).toBe(2);
      expect(requests[1].body).toEqual({ phrases: [hearing] });
      requests[1].reply.next({ translations: { [hearing]: welshHearing } });
      expect(second.at(-1)).toBe(welshHearing);
      expect(requests.length).toBe(2);
    }));
  }

  for (const outcome of ['success', 'failure']) {
    it(`keeps dispatched batches independent when the second finishes before the first ${outcome}`, fakeAsync(() => {
      const first: string[] = [];
      const alias: string[] = [];
      const second: string[] = [];
      subscriptions.push(service.getTranslation$(notice).subscribe((value) => first.push(value)));
      tick(debounceMs);
      subscriptions.push(service.getTranslation$(hearing).subscribe((value) => second.push(value)));
      tick(debounceMs);
      expect(requests.length).toBe(2);
      expect(requests[0].body).toEqual({ phrases: [notice] });
      expect(requests[1].body).toEqual({ phrases: [hearing] });
      subscriptions.push(service.getTranslation$('Notice  of charge').subscribe((value) => alias.push(value)));
      tick(debounceMs);
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
      expect(writes.calls.mostRecent().args[0].map((translation: { phrase: string }) => translation.phrase)).toEqual([notice]);
      expect(requests.length).toBe(2);
    }));
  }

});
