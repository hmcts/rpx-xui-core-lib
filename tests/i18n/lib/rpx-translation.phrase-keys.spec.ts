import { afterEach, beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { db } from '../../../projects/core-lib/i18n/lib/db';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';

afterEach(() => vi.useRealTimers());

describe('RpxTranslationService phrase dictionary keys', () => {
  let service: RpxTranslationService;
  let reply: Subject<{ translations: Record<string, string> }>;
  let post: Mock;
  let subscriptions: Subscription[];
  let writes: MockInstance<typeof db.translations.bulkAdd>;

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    subscriptions = [];
    reply = new Subject();
    post = vi.fn().mockReturnValue(reply);
    vi.spyOn(db.translations, 'where').mockReturnValue({
      equals: () => ({ last: () => Promise.resolve(undefined) })
    } as unknown as ReturnType<typeof db.translations.where>);
    writes = vi.spyOn(db.translations, 'bulkAdd').mockImplementation(() => undefined as never);
    service = new RpxTranslationService(
      { baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false },
      { post } as unknown as HttpClient
    );
  });

  afterEach(() => {
    service.language = 'en';
    subscriptions.forEach(subscription => subscription.unsubscribe());
    reply.complete();
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
  });

  for (const phrase of ['hasOwnProperty', '__proto__']) {
    for (const outcome of ['success', 'failure']) {
      it(`keeps ${phrase} and subsequent phrases working across a language change and HTTP ${outcome}`, async () => {
    vi.useFakeTimers();
        const special: string[] = [];
        const ordinary: string[] = [];
        subscriptions.push(service.getTranslation$(phrase).subscribe(value => special.push(value)));
        subscriptions.push(service.getTranslation$('Normal phrase').subscribe(value => ordinary.push(value)));
        expect(special).toEqual([phrase]);
        expect(ordinary).toEqual(['Normal phrase']);
        expect(post).not.toHaveBeenCalled();

        service.language = 'cy';
        await vi.advanceTimersByTimeAsync(20);
        expect(post).toHaveBeenCalledExactlyOnceWith('/translations/cy', { phrases: [phrase, 'Normal phrase'] });
        if (outcome === 'success') {
          reply.next({ translations: { [phrase]: 'Cy special', 'Normal phrase': 'Cy normal' } });
        } else {
          reply.error(new HttpErrorResponse({ status: 500 }));
        }
        expect(special.at(-1)).toBe(outcome === 'success' ? 'Cy special' : phrase);
        expect(ordinary.at(-1)).toBe(outcome === 'success' ? 'Cy normal' : 'Normal phrase');
        if (outcome === 'success') {
          expect(writes).toHaveBeenCalledWith([
            expect.objectContaining({ phrase, lang: 'cy', translation: { translation: 'Cy special' } }),
            expect.objectContaining({ phrase: 'Normal phrase', lang: 'cy', translation: { translation: 'Cy normal' } })
          ]);
        } else {
          expect(writes).not.toHaveBeenCalled();
        }
      });
    }
  }
});
