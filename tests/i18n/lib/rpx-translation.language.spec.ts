import { afterEach, beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { db, Translation } from '../../../projects/core-lib/i18n/lib/db';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';

afterEach(() => vi.useRealTimers());

type TranslationReply = { translations: Record<string, string> };

const phrase = 'Notice of charge';
const welsh = 'Hysbysiad o arwystl';
const debounceMs = 20;

describe('RpxTranslationService language changes', () => {
  let service: RpxTranslationService;
  let post: Mock;
  let reply: Subject<TranslationReply>;
  let lookup: Mock;
  let writes: MockInstance<typeof db.translations.bulkAdd>;
  let subscriptions: Subscription[];

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    reply = new Subject<TranslationReply>();
    post = vi.fn().mockReturnValue(reply);
    lookup = vi.fn().mockImplementation(() => Promise.resolve(undefined));
    vi.spyOn(db.translations, 'where').mockReturnValue({
      equals: () => ({ last: lookup })
    } as unknown as ReturnType<typeof db.translations.where>);
    writes = vi.spyOn(db.translations, 'bulkAdd').mockImplementation(() => undefined as never);
    subscriptions = [];
    service = new RpxTranslationService(
      { baseUrl: '/translations', debounceTimeMs: debounceMs, validity: { days: 1 }, testMode: false },
      { post } as unknown as HttpClient
    );
    service.language = 'cy';
  });

  afterEach(() => {
    service.language = 'en';
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    reply.complete();
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
  });

  it('retires a pending cache lookup on English selection and can reuse Welsh cache later', async () => {
    let resolveLookup!: (translation: Translation) => void;
    let lookupStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      lookupStarted = resolve;
    });
    const pendingLookup = new Promise<Translation>((resolve) => {
      resolveLookup = resolve;
    });
    const cached = Translation.create(phrase, 'cy', { translation: welsh }, '2999-01-01T00:00:00.000Z');
    lookup.mockImplementation(() => {
      lookupStarted();
      return lookup.mock.calls.length === 1 ? pendingLookup : Promise.resolve(cached);
    });
    const values: string[] = [];
    let cacheReused: () => void = () => undefined;
    subscriptions.push(service.getTranslation$(phrase).subscribe((value) => {
      values.push(value);
      if (value === welsh) {
        cacheReused();
      }
    }));
    await started;
    expect(lookup).toHaveBeenCalledTimes(1);

    service.language = 'en';
    expect(values.at(-1)).toBe(phrase);
    const englishEmissions = values.length;
    resolveLookup(cached);
    await pendingLookup;
    // A task boundary drains liveQuery's promise delivery before the no-emission assertion.
    await new Promise<void>((resolve) => setTimeout(resolve));
    expect(values.length).toBe(englishEmissions);
    expect(values.at(-1)).toBe(phrase);
    expect(post).not.toHaveBeenCalled();

    const restored = new Promise<void>((resolve) => {
      cacheReused = resolve;
    });
    service.language = 'cy';
    await restored;
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(values.at(-1)).toBe(welsh);
    expect(post).not.toHaveBeenCalled();
  });

  it('caches a late Welsh response without overwriting English', async () => {
    vi.useFakeTimers();
    const values: string[] = [];
    subscriptions.push(service.getTranslation$(phrase).subscribe((value) => values.push(value)));
    await vi.advanceTimersByTimeAsync(debounceMs);
    expect(post).toHaveBeenCalledExactlyOnceWith('/translations/cy', { phrases: [phrase] });
    expect(values.at(-1)).toBe(`${phrase} [Translation in progress]`);
    service.language = 'en';
    const englishEmissions = values.length;

    reply.next({ translations: { [phrase]: welsh } });
    expect(writes).toHaveBeenCalledWith([
      expect.objectContaining({ phrase, lang: 'cy', translation: { translation: welsh } })
    ]);
    expect(values.length).toBe(englishEmissions);
    expect(values.at(-1)).toBe(phrase);
  });

  it('does not replace English with a stale failed-request fallback', async () => {
    vi.useFakeTimers();
    const values: string[] = [];
    subscriptions.push(service.getTranslation$(phrase).subscribe((value) => values.push(value)));
    await vi.advanceTimersByTimeAsync(debounceMs);
    expect(post).toHaveBeenCalledTimes(1);
    expect(values.at(-1)).toBe(`${phrase} [Translation in progress]`);
    service.language = 'en';
    const englishEmissions = values.length;

    reply.error(new HttpErrorResponse({ status: 500, statusText: 'Synthetic failure' }));
    expect(values.length).toBe(englishEmissions);
    expect(values.at(-1)).toBe(phrase);
    expect(writes).toHaveBeenCalledWith([
      expect.objectContaining({ phrase, lang: 'cy', translation: { translation: phrase } })
    ]);
  });

  it('returns English for phrases matching inherited Object property names', () => {
    service.language = 'en';
    for (const source of ['constructor', 'toString', 'valueOf']) {
      const values: string[] = [];
      subscriptions.push(service.getTranslation$(source).subscribe((value) => values.push(value)));
      expect(values).toEqual([source]);
    }
    expect(post).not.toHaveBeenCalled();
  });
});
