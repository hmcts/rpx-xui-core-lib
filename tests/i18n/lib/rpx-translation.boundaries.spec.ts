import { afterEach, beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';

import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { db, Translation } from '../../../projects/core-lib/i18n/lib/db';
import { RpxLanguage } from '../../../projects/core-lib/i18n/lib/rpx-language.enum';
import { TranslatedData } from '../../../projects/core-lib/i18n/lib/models/translated-data.model';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';

afterEach(() => vi.useRealTimers());

const config = { baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false };

describe('translation boundary validation', () => {
  let service: RpxTranslationService;
  let http: HttpTestingController;
  let lookup: Mock;
  let writes: MockInstance<typeof db.translations.bulkAdd>;
  let deletes: MockInstance<typeof db.translations.delete>;
  let warning: MockInstance<typeof console.warn>;

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    warning = vi.spyOn(console, 'warn');
    lookup = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(db.translations, 'where').mockReturnValue({ equals: () => ({ last: lookup }) } as unknown as ReturnType<typeof db.translations.where>);
    writes = vi.spyOn(db.translations, 'bulkAdd').mockResolvedValue(1);
    deletes = vi.spyOn(db.translations, 'delete').mockResolvedValue();
    service = new RpxTranslationService(config, TestBed.inject(HttpClient));
  });

  afterEach(() => {
    service.ngOnDestroy();
    http.verify();
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
  });

  it('accepts only supported persisted and assigned languages', () => {
    document.cookie = 'exui-preferred-language=constructor; SameSite=Strict;';
    const persisted = new RpxTranslationService(config, TestBed.inject(HttpClient));
    expect(persisted.language).toBe('en');
    expect(document.cookie).toContain('exui-preferred-language=en');
    persisted.language = 'constructor' as RpxLanguage;
    expect(persisted.language).toBe('en');
    expect(document.cookie).toContain('exui-preferred-language=en');
    persisted.language = 'cy';
    expect(document.cookie).toContain('exui-preferred-language=cy');
    persisted.ngOnDestroy();
  });

  it('falls back for malformed response values without caching them and retains valid siblings', async () => {
    vi.useFakeTimers();
    service.language = 'cy';
    const first: string[] = [];
    const second: string[] = [];
    service.getTranslation$('first').subscribe(value => first.push(value));
    service.getTranslation$('second').subscribe(value => second.push(value));
    await vi.advanceTimersByTimeAsync(20);
    http.expectOne('/translations/cy').flush({ translations: { first: 'cyntaf', second: null, extra: 'ignored' } });
    expect(first.at(-1)).toBe('cyntaf');
    expect(second.at(-1)).toBe('second');
    expect(writes).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ phrase: 'first', translation: { translation: 'cyntaf' } })]);
    const again: string[] = [];
    service.getTranslation$('second').subscribe(value => again.push(value));
    expect(again).toEqual(['second']);
    http.expectNone('/translations/cy');
  });

  it('treats rejected cache reads as misses and preserves output when writes reject', async () => {
    vi.useFakeTimers();
    lookup.mockRejectedValue(new Error('synthetic read failure'));
    writes.mockRejectedValue(new Error('synthetic write failure'));
    service.language = 'cy';
    const values: string[] = [];
    service.getTranslation$('first').subscribe(value => values.push(value));
    await vi.advanceTimersByTimeAsync(20);
    http.expectOne('/translations/cy').flush({ translations: { first: 'cyntaf' } });
    await vi.advanceTimersByTimeAsync(0);
    expect(values.at(-1)).toBe('cyntaf');
    expect(warning.mock.calls).toEqual([['Translation cache read failed'], ['Translation cache write failed']]);
  });

  it('rejects malformed cached values and tolerates deletion failure', async () => {
    vi.useFakeTimers();
    const cached = Translation.create('first', 'cy', { translation: null } as unknown as TranslatedData, '2999-01-01T00:00:00.000Z');
    cached.id = 1;
    lookup.mockResolvedValue(cached);
    deletes.mockRejectedValue(new Error('synthetic delete failure'));
    service.language = 'cy';
    const values: string[] = [];
    service.getTranslation$('first').subscribe(value => values.push(value));
    await vi.advanceTimersByTimeAsync(20);
    http.expectOne('/translations/cy').flush({ translations: { first: 'cyntaf' } });
    await vi.advanceTimersByTimeAsync(0);
    expect(values as unknown[]).not.toContain(null);
    expect(values.at(-1)).toBe('cyntaf');
    expect(deletes).toHaveBeenCalledExactlyOnceWith(1);
    expect(warning).toHaveBeenCalledExactlyOnceWith('Translation cache delete failed');
  });
  it('falls back for malformed payloads and metadata, and accepts an empty translation', async () => {
    vi.useFakeTimers();
    service.language = 'cy';
    const malformed: unknown[] = [null, [], 'bad', {}, { translations: [] }, { translations: {} },
      { translations: { source: { translation: 1 } } },
      { translations: { source: { translation: 'valid', yes: null } } },
      { translations: { source: { translation: 'valid', no: 2 } } },
      { translations: { source: { translation: 'valid', yesOrNoField: 'yes' } } }];
    for (const response of malformed) {
      const values: string[] = [];
      service.getTranslation$('source').subscribe(value => values.push(value));
      await vi.advanceTimersByTimeAsync(20);
      http.expectOne('/translations/cy').flush(response);
      expect(values.at(-1)).toBe('source');
      service.language = 'en';
      service.language = 'cy';
    }
    await vi.advanceTimersByTimeAsync(20);
    http.expectOne('/translations/cy').flush({ translations: { source: '' } });
    expect(writes).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ phrase: 'source', translation: { translation: '' } })]);
  });

  it('uses valid cached empty strings and metadata without HTTP', async () => {
    vi.useFakeTimers();
    lookup.mockResolvedValue(Translation.create('source', 'cy', { translation: '', yes: 'Ie', no: 'Na', yesOrNoField: true }, '2999-01-01T00:00:00.000Z'));
    service.language = 'cy';
    const values: string[] = [];
    service.getTranslation$('source').subscribe(value => values.push(value));
    await vi.advanceTimersByTimeAsync(20);
    expect(values.at(-1)).toBe('');
    http.expectNone('/translations/cy');
  });

  it('tolerates an expired cache deletion failure', async () => {
    vi.useFakeTimers();
    const cached = Translation.create('source', 'cy', { translation: 'expired' }, '2000-01-01T00:00:00.000Z');
    cached.id = 2;
    lookup.mockResolvedValue(cached);
    deletes.mockRejectedValue(new Error('synthetic secret'));
    service.language = 'cy';
    const values: string[] = [];
    service.getTranslation$('source').subscribe(value => values.push(value));
    await vi.advanceTimersByTimeAsync(20);
    http.expectOne('/translations/cy').flush({ translations: { source: 'new' } });
    await vi.advanceTimersByTimeAsync(0);
    expect(values.at(-1)).toBe('new');
    expect(warning).toHaveBeenCalledExactlyOnceWith('Translation cache delete failed');
  });

  it('uses own response keys for normalized phrases with inherited property names', async () => {
    vi.useFakeTimers();
    service.language = 'cy';
    const values: string[] = [];
    service.getTranslation$('constructor').subscribe(value => values.push(value));
    await vi.advanceTimersByTimeAsync(20);
    http.expectOne('/translations/cy').flush({ translations: {} });
    expect(values.at(-1)).toBe('constructor');
    expect(writes).not.toHaveBeenCalled();
  });

  it('uses the configured test-mode fallback without caching a malformed response', async () => {
    vi.useFakeTimers();
    service.ngOnDestroy();
    service = new RpxTranslationService({ ...config, testMode: true }, TestBed.inject(HttpClient));
    service.language = 'cy';
    const values: string[] = [];
    service.getTranslation$('source').subscribe(value => values.push(value));
    await vi.advanceTimersByTimeAsync(20);
    http.expectOne('/translations/cy').flush({ translations: { source: null } });
    expect(values.at(-1)).toBe('[Test translation for source]');
    expect(writes).not.toHaveBeenCalled();
  });

});
