import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { Subject, Subscription } from 'rxjs';
import { db } from '../../../projects/core-lib/i18n/lib/db';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';

describe('RpxTranslationService phrase dictionary keys', () => {
  let service: RpxTranslationService;
  let reply: Subject<{ translations: Record<string, string> }>;
  let post: jasmine.Spy;
  let subscriptions: Subscription[];
  let writes: jasmine.Spy;

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    subscriptions = [];
    reply = new Subject();
    post = jasmine.createSpy('post').and.returnValue(reply);
    spyOn(db.translations, 'where').and.returnValue({
      equals: () => ({ first: () => Promise.resolve(undefined) })
    } as unknown as ReturnType<typeof db.translations.where>);
    writes = spyOn(db.translations, 'bulkAdd').and.stub();
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
      it(`keeps ${phrase} and subsequent phrases working across a language change and HTTP ${outcome}`, fakeAsync(() => {
        const special: string[] = [];
        const ordinary: string[] = [];
        subscriptions.push(service.getTranslation$(phrase).subscribe(value => special.push(value)));
        subscriptions.push(service.getTranslation$('Normal phrase').subscribe(value => ordinary.push(value)));
        expect(special).toEqual([phrase]);
        expect(ordinary).toEqual(['Normal phrase']);
        expect(post).not.toHaveBeenCalled();

        service.language = 'cy';
        tick(20);
        expect(post).toHaveBeenCalledOnceWith('/translations/cy', { phrases: [phrase, 'Normal phrase'] });
        if (outcome === 'success') {
          reply.next({ translations: { [phrase]: 'Cy special', 'Normal phrase': 'Cy normal' } });
        } else {
          reply.error(new HttpErrorResponse({ status: 500 }));
        }
        expect(special.at(-1)).toBe(outcome === 'success' ? 'Cy special' : phrase);
        expect(ordinary.at(-1)).toBe(outcome === 'success' ? 'Cy normal' : 'Normal phrase');
        expect(writes).toHaveBeenCalledWith([
          jasmine.objectContaining({ phrase, lang: 'cy', translation: { translation: outcome === 'success' ? 'Cy special' : phrase } }),
          jasmine.objectContaining({ phrase: 'Normal phrase', lang: 'cy', translation: { translation: outcome === 'success' ? 'Cy normal' : 'Normal phrase' } })
        ]);
      }));
    }
  }
});
