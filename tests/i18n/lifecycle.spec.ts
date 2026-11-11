import { HttpClient } from '@angular/common/http';
import { EnvironmentInjector, createEnvironmentInjector, importProvidersFrom } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { liveQuery } from 'dexie';
import { DateTime } from 'luxon';
import { Subject, Subscription, filter, firstValueFrom, from, of, throwError } from 'rxjs';
import { db, Translation } from '../../projects/core-lib/i18n/lib/db';
import { RpxTranslationModule, RpxTranslationService } from '../../projects/core-lib/i18n/public-api';

describe('translation provider lifecycle', () => {
  const debounceTimeMs = 20;
  const config = { baseUrl: '/translations', debounceTimeMs, validity: { days: 1 }, testMode: false };
  let post: jasmine.Spy;
  let reply: Subject<{ translations: Record<string, string> }>;
  let cacheResult: Promise<undefined>;

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=en; SameSite=Strict;';
    TestBed.configureTestingModule({});
    reply = new Subject();
    post = jasmine.createSpy('post').and.returnValue(reply);
    cacheResult = Promise.resolve(undefined);
    spyOn(db.translations, 'where').and.callFake((() => ({
      equals: () => ({ first: () => cacheResult })
    })) as unknown as typeof db.translations.where);
    spyOn(db.translations, 'bulkAdd').and.stub();
  });

  afterEach(() => {
    reply.complete();
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
  });

  function owner(): EnvironmentInjector {
    return createEnvironmentInjector([
      importProvidersFrom(RpxTranslationModule.forRoot(config)),
      { provide: HttpClient, useValue: { post } }
    ], TestBed.inject(EnvironmentInjector));
  }

  it('does not dispatch a pending batch after its owner is destroyed', fakeAsync(() => {
    const injector = owner();
    const service = injector.get(RpxTranslationService);
    service.language = 'cy';
    const subscription = service.getTranslation$('Hello').subscribe();
    tick(0);
    injector.destroy();
    tick(debounceTimeMs);
    expect(post).not.toHaveBeenCalled();
    subscription.unsubscribe();
  }));

  it('cancels an in-flight request when its owner is destroyed', fakeAsync(() => {
    const injector = owner();
    const service = injector.get(RpxTranslationService);
    service.language = 'cy';
    const values: string[] = [];
    const subscription = service.getTranslation$('Hello').subscribe((value) => values.push(value));
    tick(debounceTimeMs);
    expect(post).toHaveBeenCalledTimes(1);
    injector.destroy();
    reply.next({ translations: { Hello: 'Helo' } });
    expect(values.at(-1)).toBe('Hello [Translation in progress]');
    expect(db.translations.bulkAdd).not.toHaveBeenCalled();
    expect(reply.observed).toBeFalse();
    subscription.unsubscribe();
  }));

  it('cancels all overlapping requests when their owner is destroyed', fakeAsync(() => {
    const secondReply = new Subject<{ translations: Record<string, string> }>();
    post.and.returnValues(reply, secondReply);
    const injector = owner();
    const service = injector.get(RpxTranslationService);
    service.language = 'cy';
    const first = service.getTranslation$('Hello').subscribe();
    tick(debounceTimeMs);
    const second = service.getTranslation$('Goodbye').subscribe();
    tick(debounceTimeMs);
    expect(post).toHaveBeenCalledTimes(2);
    injector.destroy();
    expect(reply.observed).toBeFalse();
    expect(secondReply.observed).toBeFalse();
    reply.next({ translations: { Hello: 'Helo' } });
    secondReply.next({ translations: { Goodbye: 'Hwyl' } });
    expect(db.translations.bulkAdd).not.toHaveBeenCalled();
    first.unsubscribe();
    second.unsubscribe();
  }));

  it('stops response processing if a subscriber destroys the owner', fakeAsync(() => {
    const injector = owner();
    const service = injector.get(RpxTranslationService);
    service.language = 'cy';
    const first = service.getTranslation$('Hello').subscribe((value) => {
      if (value === 'Helo') injector.destroy();
    });
    const secondValues: string[] = [];
    const second = service.getTranslation$('Goodbye').subscribe((value) => secondValues.push(value));
    tick(debounceTimeMs);
    reply.next({ translations: { Hello: 'Helo', Goodbye: 'Hwyl' } });
    expect(secondValues.at(-1)).toBe('Goodbye [Translation in progress]');
    expect(db.translations.bulkAdd).not.toHaveBeenCalled();
    first.unsubscribe();
    second.unsubscribe();
  }));

  it('stops cache-miss processing if a subscriber destroys the owner', fakeAsync(() => {
    const injector = owner();
    const service = injector.get(RpxTranslationService);
    service.language = 'cy';
    const values: string[] = [];
    const subscription = service.getTranslation$('123').subscribe((value) => {
      values.push(value);
      if (value.includes('[Translation in progress]')) injector.destroy();
    });
    tick(debounceTimeMs);
    expect(values.at(-1)).toBe('123 [Translation in progress]');
    expect(post).not.toHaveBeenCalled();
    subscription.unsubscribe();
  }));

  it('stops a language change when its subscriber destroys the owner', fakeAsync(() => {
    const injector = owner();
    const service = injector.get(RpxTranslationService);
    service.language = 'cy';
    const values: string[] = [];
    const phrase = service.getTranslation$('Hello').subscribe((value) => values.push(value));
    tick(debounceTimeMs);
    reply.next({ translations: { Hello: 'Helo' } });
    const language = service.language$.subscribe((value) => {
      if (value === 'en') injector.destroy();
    });
    service.language = 'en';
    expect(values.at(-1)).toBe('Helo');
    phrase.unsubscribe();
    language.unsubscribe();
  }));

  it('ignores a cache lookup that finishes after its owner is destroyed', fakeAsync(() => {
    let resolveCache!: (value: undefined) => void;
    cacheResult = new Promise((resolve) => { resolveCache = resolve; });
    const injector = owner();
    const service = injector.get(RpxTranslationService);
    service.language = 'cy';
    const subscription = service.getTranslation$('Hello').subscribe();
    tick(0);
    injector.destroy();
    resolveCache(undefined);
    tick(debounceTimeMs);
    expect(post).not.toHaveBeenCalled();
    subscription.unsubscribe();
  }));

  it('stops observing cached translations when its owner is destroyed', async () => {
    const phrase = 'EXUI lifecycle cache proof';
    (db.translations.where as jasmine.Spy).and.callThrough();
    await db.open();
    const id = await db.translations.add(Translation.create(phrase, 'cy', { translation: 'Helo' }, DateTime.now().plus({ days: 1 }).toISO()!));
    const injector = owner();
    try {
      const service = injector.get(RpxTranslationService);
      service.language = 'cy';
      const values: string[] = [];
      const translations = service.getTranslation$(phrase);
      const subscription = translations.subscribe((value) => values.push(value));
      await firstValueFrom(translations.pipe(filter((value) => value === 'Helo')));
      const observer = (service as unknown as { cacheSubscriptions: Record<string, Subscription> }).cacheSubscriptions[phrase];
      expect(observer.closed).toBeFalse();
      injector.destroy();
      expect(observer.closed).toBeTrue();
      const changed = firstValueFrom(from(liveQuery(() => db.translations.get(id))).pipe(filter((value) => value?.translation.translation === 'New value')));
      await db.translations.update(id, { translation: { translation: 'New value' } });
      await changed;
      await Promise.resolve();
      expect(values.at(-1)).toBe('Helo');
      subscription.unsubscribe();
    } finally {
      if (!injector.destroyed) injector.destroy();
      await db.translations.delete(id);
    }
  });

  it('keeps the root service active when a forChild injector is destroyed', fakeAsync(() => {
    const root = owner();
    const service = root.get(RpxTranslationService);
    const child = createEnvironmentInjector([importProvidersFrom(RpxTranslationModule.forChild())], root);
    expect(child.get(RpxTranslationService)).toBe(service);
    service.language = 'cy';
    const values: string[] = [];
    const subscription = service.getTranslation$('Hello').subscribe((value) => values.push(value));
    child.destroy();
    tick(debounceTimeMs);
    expect(post).toHaveBeenCalledTimes(1);
    reply.next({ translations: { Hello: 'Helo' } });
    reply.next({ translations: { Hello: 'Unwanted second response' } });
    expect(values.at(-1)).toBe('Helo');
    expect(db.translations.bulkAdd).toHaveBeenCalledTimes(1);
    root.destroy();
    subscription.unsubscribe();
  }));

  for (const outcome of ['success', 'failure']) {
    it(`handles a synchronously completed HTTP ${outcome}`, fakeAsync(() => {
      post.and.returnValue(outcome === 'success'
        ? of({ translations: { Hello: 'Helo' } })
        : throwError(() => new Error('Synthetic error')));
      const injector = owner();
      const service = injector.get(RpxTranslationService);
      const values: string[] = [];
      service.language = 'cy';
      const subscription = service.getTranslation$('Hello').subscribe((value) => values.push(value));
      tick(debounceTimeMs);
      expect(values.at(-1)).toBe(outcome === 'success' ? 'Helo' : 'Hello');
      injector.destroy();
      subscription.unsubscribe();
    }));
  }
});
