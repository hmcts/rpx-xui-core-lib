import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { db } from '../../../projects/core-lib/i18n/lib/db';
import { RpxTranslationConfig } from '../../../projects/core-lib/i18n/lib/rpx-translation.config';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

afterEach(() => vi.useRealTimers());

describe('RpxTranslationService', () => {
  let service: RpxTranslationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        RpxTranslationService,
        {
          provide: RpxTranslationConfig,
          useValue: {
            baseUrl: 'translations',
            debounceTimeMs: 500,
            validity: { days: 1 }
          }
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(RpxTranslationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    let verificationError: unknown;
    try {
      httpMock.verify();
    } catch (error) {
      verificationError = error;
    }
    service.ngOnDestroy();
    document.cookie = 'exui-preferred-language=; Max-Age=0; SameSite=Strict;';
    try {
      await db.delete();
    } catch (cleanupError) {
      if (verificationError) throw new AggregateError([verificationError, cleanupError], 'HTTP verification and database cleanup failed');
      throw cleanupError;
    }
    if (verificationError) throw verificationError;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return the default language en as a string', () => {
    expect(service.language).toEqual('en');
  });

  it('should normalise repeated spacing before translating a phrase', async () => {
    const translation = await firstValueFrom(service.getTranslation$(' notice  of charge '));
    expect((service as any).normalisePhraseSpacing(translation)).toBe('notice of charge');
    expect(translation).toBe('notice  of charge');
  });

  it('should normalise multiple spacing runs before translating a phrase', async () => {
    const translation = await firstValueFrom(service.getTranslation$('notice   of    charge'));
    expect((service as any).normalisePhraseSpacing(translation)).toBe('notice of charge');
    expect(translation).toBe('notice   of    charge');
  });

  it('should preserve markdown line breaks while normalising horizontal spacing', () => {
    const markdown = 'Current progress of the case\n\n![Progress map](https://example.com/caseOfficer_listing.svg)';

    expect((service as any).normalisePhraseSpacing(markdown)).toBe(markdown);
  });

  it('should request the normalised phrase when loading a phrase with multiple spaces', async () => {
    vi.useFakeTimers();
    const phrase = 'notice   of    charge';

    (service as any).phrases[phrase] = new BehaviorSubject({ translation: phrase });
    (service as any).load(phrase, 'cy');
    await vi.advanceTimersByTimeAsync(500);

    const request = httpMock.expectOne('translations/cy');
    expect(request.request.body).toEqual({ phrases: ['notice of charge'] });

    request.flush({
      translations: {
        'notice of charge': 'translated notice of charge'
      }
    });
  });

  it('returns English without loading a translation', () => {
    const load = vi.spyOn(service as any, 'load');
    const values: string[] = [];
    service.getTranslation$('Hello, world!').subscribe(value => values.push(value));
    expect(values).toEqual(['Hello, world!']);
    expect(load).not.toHaveBeenCalled();
    httpMock.expectNone('translations/cy');
  });

  describe('shouldTranslate', () => {
    it('should return false for phrases without alphabetic characters', () => {
      expect((service as any).shouldTranslate('123')).toBe(false);
      expect((service as any).shouldTranslate('!@#$%')).toBe(false);
      expect((service as any).shouldTranslate('   ')).toBe(false);
      expect((service as any).shouldTranslate(' ')).toBe(false);
      expect((service as any).shouldTranslate('___')).toBe(false);
      expect((service as any).shouldTranslate('123-456')).toBe(false);
    });

    it('should return true for phrases with alphabetic characters', () => {
      expect((service as any).shouldTranslate('Hello')).toBe(true);
      expect((service as any).shouldTranslate('Test123')).toBe(true);
      expect((service as any).shouldTranslate('123ABC')).toBe(true);
      expect((service as any).shouldTranslate('ABC123')).toBe(true);
      expect((service as any).shouldTranslate('a')).toBe(true);
      expect((service as any).shouldTranslate('Z')).toBe(true);
    });

    it('should return false for phrases containing [Translation in progress]', () => {
      expect((service as any).shouldTranslate('Hello [Translation in progress]')).toBe(false);
      expect((service as any).shouldTranslate('[Translation in progress]')).toBe(false);
      expect((service as any).shouldTranslate('Some text [Translation in progress] more text')).toBe(false);
    });

    it('should return true for phrases not containing [Translation in progress]', () => {
      expect((service as any).shouldTranslate('Hello World')).toBe(true);
      expect((service as any).shouldTranslate('Translation complete')).toBe(true);
      expect((service as any).shouldTranslate('[Other text]')).toBe(true);
    });

    it('should return false for placeholder-only phrases', () => {
      expect((service as any).shouldTranslate('${key}')).toBe(false);
      expect((service as any).shouldTranslate('  ${someVariable}  ')).toBe(false);
      expect((service as any).shouldTranslate('${userName}')).toBe(false);
      expect((service as any).shouldTranslate('${email}')).toBe(false);
      expect((service as any).shouldTranslate('${count}')).toBe(false);
    });

    it('should return true for phrases containing placeholders with other text', () => {
      expect((service as any).shouldTranslate('Hello ${name}')).toBe(true);
      expect((service as any).shouldTranslate('${count} items')).toBe(true);
      expect((service as any).shouldTranslate('Welcome ${user} to our site')).toBe(true);
    });

    it('should return false for null or undefined phrases', () => {
      expect((service as any).shouldTranslate(null)).toBe(false);
      expect((service as any).shouldTranslate(undefined)).toBe(false);
      expect((service as any).shouldTranslate('')).toBe(false);
    });
  });

  describe('Null/Undefined handling', () => {
    it('should handle null phrase in normalisePhraseSpacing', () => {
      const result = (service as any).normalisePhraseSpacing(null);
      expect(result).toBe('');
    });

    it('should handle undefined phrase in normalisePhraseSpacing', () => {
      const result = (service as any).normalisePhraseSpacing(undefined);
      expect(result).toBe('');
    });

    it('should handle empty string in normalisePhraseSpacing', () => {
      const result = (service as any).normalisePhraseSpacing('');
      expect(result).toBe('');
    });

    it('should handle null phrase in getTranslation$', async () => {
      expect(await firstValueFrom(service.getTranslation$(null as any))).toBe('');
    });

    it('should handle undefined phrase in getTranslation$', async () => {
      expect(await firstValueFrom(service.getTranslation$(undefined as any))).toBe('');
    });

    it('should safely get persisted language when cookie not set', () => {
      // The service has a default language, but getPersistedLanguage should return undefined
      // when the cookie is not present
      const languageKey = 'exui-preferred-language';
      // Ensure cookie is not set
      const cookieValue = document.cookie
        .split(';')
        .find((cookie) => cookie.trim().startsWith(languageKey + '='));

      // If cookie exists, remove it
      if (cookieValue) {
        document.cookie = `${languageKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict;`;
      }

      const result = (service as any).getPersistedLanguage();
      // Should safely return undefined without throwing when cookie is not present
      expect(result).toBeUndefined();
    });

    it('should safely get persisted language when cookie is set', () => {
      // Set a language cookie
      const languageKey = 'exui-preferred-language';
      document.cookie = `${languageKey}=cy; SameSite=Strict;`;
      const result = (service as any).getPersistedLanguage();
      expect(result).toBe('cy');
      // Cleanup
      document.cookie = `${languageKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict;`;
    });

    it('should handle normalisePhraseSpacing with multiple spaces and null/undefined', () => {
      const testCases = [
        { input: null, expected: '' },
        { input: undefined, expected: '' },
        { input: '', expected: '' },
        { input: '  hello   world  ', expected: 'hello world' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (service as any).normalisePhraseSpacing(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle shouldTranslate with various null/undefined edge cases', () => {
      expect((service as any).shouldTranslate(null)).toBe(false);
      expect((service as any).shouldTranslate(undefined)).toBe(false);
      expect((service as any).shouldTranslate('')).toBe(false);
      expect((service as any).shouldTranslate('   ')).toBe(false);
      expect((service as any).shouldTranslate('a')).toBe(true);
    });

    it('should handle getTranslationWithYesOrNo$ with null yesOrNoValue', async () => {
      service.language = 'cy';
      expect(await firstValueFrom(service.getTranslationWithYesOrNo$('Test', null as any))).toBe('');
      httpMock.expectNone('translations/cy');
    });

    it('returns an empty string for undefined yesOrNoValue without a request', async () => {
      service.language = 'cy';
      expect(await firstValueFrom(service.getTranslationWithYesOrNo$('Test', undefined as any))).toBe('');
      httpMock.expectNone('translations/cy');
    });

    it('should handle getTranslationWithReplacements$ with empty replacements', async () => {
      const phrase = 'Test  phrase'; // Note: phrase has two spaces
      const translation = await firstValueFrom(service.getTranslationWithReplacements$(phrase, {}));
      // When there are no replacements, the phrase is processed but may have spacing adjusted.
      expect(translation).toBeDefined();
      expect(translation).toContain('Test');
      expect(translation).toContain('phrase');
    });
  });
});
