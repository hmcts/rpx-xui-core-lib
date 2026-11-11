import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { db, Translation } from '../../../projects/core-lib/i18n/lib/db';
import { TranslatedData } from '../../../projects/core-lib/i18n/lib/models/translated-data.model';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';

const config = { baseUrl: '/translations', debounceTimeMs: 10, validity: { days: 1 }, testMode: false };

async function waitFor<T>(probe: () => T | undefined | Promise<T | undefined>): Promise<T> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value !== undefined) return value;
    await new Promise<void>(resolve => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for cache or request state');
}

describe('translation real cache recovery', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let services: RpxTranslationService[];

  function createService(): RpxTranslationService {
    const service = new RpxTranslationService(config, client);
    services.push(service);
    service.language = 'cy';
    return service;
  }

  function nextRequest(): Promise<TestRequest> {
    return waitFor(() => http.match('/translations/cy')[0]);
  }

  beforeEach(async () => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    await db.delete();
    await db.open();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    services = [];
    spyOn(console, 'warn');
  });

  afterEach(async () => {
    services.forEach(service => service.ngOnDestroy());
    http.verify({ ignoreCancelled: true });
    await db.delete();
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
  });

  it('keeps literal values out of requests and real IndexedDB across language changes', async () => {
    const service = createService();
    const values: string[] = [];
    const literal = 'Fictional Person 123';
    service.getTranslationWithReplacements$('Hello %NAME%!', {}, { NAME: literal }).subscribe(value => values.push(value));
    const request = await nextRequest();
    expect(JSON.stringify(request.request.body)).not.toContain(literal);
    request.flush({ translations: { Hello: 'Helo', '!': '!' } });
    await waitFor(async () => (await db.translations.count()) > 0 ? true : undefined);
    expect(values.at(-1)).toBe('Helo ' + literal + '!');
    expect(JSON.stringify(await db.translations.toArray())).not.toContain(literal);
    service.language = 'en';
    service.language = 'cy';
    await new Promise<void>(resolve => setTimeout(resolve, config.debounceTimeMs * 5));
    expect(JSON.stringify(http.match('/translations/cy').map(req => req.request.body))).not.toContain(literal);
    expect(JSON.stringify(await db.translations.toArray())).not.toContain(literal);
  });

  for (const kind of ['invalid', 'expired']) {
    it(`recovers from a rejected ${kind} deletion with real IndexedDB and a fresh service`, async () => {
      const data = kind === 'invalid' ? { translation: null } as unknown as TranslatedData : { translation: 'old' };
      const validity = kind === 'expired' ? '2000-01-01T00:00:00.000Z' : '2999-01-01T00:00:00.000Z';
      await db.translations.add(Translation.create('source', 'cy', data, validity));
      const deletion = spyOn(db.translations, 'delete').and.rejectWith(new Error('synthetic failure'));
      const service = createService();
      const values: string[] = [];
      service.getTranslation$('source').subscribe(value => values.push(value));
      (await nextRequest()).flush({ translations: { source: 'new' } });
      await waitFor(async () => (await db.translations.toArray()).length === 2 ? true : undefined);
      // Observe for longer than the debounce interval so another request cannot be hidden.
      await new Promise<void>(resolve => setTimeout(resolve, config.debounceTimeMs * 5));
      expect(values.at(-1)).toBe('new');
      expect(http.match('/translations/cy')).toEqual([]);
      expect(deletion).toHaveBeenCalled();
      service.ngOnDestroy();
      const fresh = createService();
      const restored: string[] = [];
      fresh.getTranslation$('source').subscribe(value => restored.push(value));
      await waitFor(() => restored.includes('new') ? true : undefined);
      await new Promise<void>(resolve => setTimeout(resolve, config.debounceTimeMs * 5));
      expect(restored.at(-1)).toBe('new');
      expect(http.match('/translations/cy')).toEqual([]);
    });
  }

  it('keeps a malformed response fallback stable then recovers after a language cycle', async () => {
    const service = createService();
    const values: string[] = [];
    service.getTranslation$('source').subscribe(value => values.push(value));
    (await nextRequest()).flush({ translations: { source: null } });
    expect(values.at(-1)).toBe('source');
    const repeated: string[] = [];
    service.getTranslation$('source').subscribe(value => repeated.push(value));
    expect(repeated).toEqual(['source']);
    expect(await db.translations.count()).toBe(0);
    expect(http.match('/translations/cy')).toEqual([]);
    service.language = 'en';
    service.language = 'cy';
    (await nextRequest()).flush({ translations: { source: 'new' } });
    await waitFor(async () => (await db.translations.count()) === 1 ? true : undefined);
    expect(values.at(-1)).toBe('new');
    service.ngOnDestroy();
    const fresh = createService();
    const restored: string[] = [];
    fresh.getTranslation$('source').subscribe(value => restored.push(value));
    await waitFor(() => restored.includes('new') ? true : undefined);
    expect(http.match('/translations/cy')).toEqual([]);
  });
});
