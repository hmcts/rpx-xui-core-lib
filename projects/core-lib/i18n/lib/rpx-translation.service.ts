import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { liveQuery } from 'dexie';
import { DateTime } from 'luxon';
import { BehaviorSubject, combineLatest, from, Observable, of, Subscription, timer } from 'rxjs';
import { catchError, finalize, map, take, tap } from 'rxjs/operators';
import { db, Translation } from './db';
import { matchCase } from './helpers/match-case/match-case.helper';
import { splitPhraseIntoComponents } from './helpers/replace-placeholders/replace-placeholders.helper';
import { TranslatedData } from './models/translated-data.model';
import { RpxLanguage, YesOrNoValue } from './rpx-language.enum';
import { RpxTranslationConfig } from './rpx-translation.config';

function translationData(value: unknown): TranslatedData | undefined {
  if (typeof value === 'string') return { translation: value };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  if (!Object.hasOwn(data, 'translation') || typeof data['translation'] !== 'string') return undefined;
  if (Object.hasOwn(data, 'yes') && typeof data['yes'] !== 'string') return undefined;
  if (Object.hasOwn(data, 'no') && typeof data['no'] !== 'string') return undefined;
  if (Object.hasOwn(data, 'yesOrNoField') && typeof data['yesOrNoField'] !== 'boolean') return undefined;
  return data as unknown as TranslatedData;
}

export type Replacements = { [key: string]: string };

@Injectable()
export class RpxTranslationService implements OnDestroy {
  private readonly lifetime = new Subscription();
  private currentLanguage: RpxLanguage = 'en';
  private languageKey = 'exui-preferred-language';

  private phrases: { [phrase: string]: BehaviorSubject<TranslatedData> } = Object.create(null);
  private observables: { [phrase: string]: Observable<TranslatedData> } = Object.create(null);
  private cacheSubscriptions: { [phrase: string]: Subscription } = Object.create(null);
  private requesting: { [lang: string]: string[] } = {};
  private inFlight: { [lang: string]: Set<string> } = {};
  private requestTimerSubscription: Subscription | null;
  private languageSource: BehaviorSubject<RpxLanguage> = new BehaviorSubject<RpxLanguage>(this.currentLanguage);
  public language$: Observable<RpxLanguage>;

  public get language(): RpxLanguage {
    return this.currentLanguage;
  }

  public set language(lang: RpxLanguage) {
    if ((lang === 'en' || lang === 'cy') && lang !== this.currentLanguage) {
      this.currentLanguage = lang;
      this.persistLanguage();
      this.languageSource.next(lang);
      Object.keys(this.phrases).forEach((phrase) => {
        if (!this.lifetime.closed) this.translate(phrase);
      });
    }
  }

  constructor(
    private config: RpxTranslationConfig,
    private http: HttpClient
  ) {
    const persistedLanguage = this.getPersistedLanguage();
    if (persistedLanguage) {
      this.language = persistedLanguage;
    } else {
      // no language persisted yet, save default
      this.persistLanguage();
    }
    this.language$ = this.languageSource.asObservable();
  }

  ngOnDestroy(): void {
    this.lifetime.unsubscribe();
  }

  public getTranslation$(phrase: string): Observable<string> {
    return this.getTranslatedData((phrase || '').trim()).pipe(
      map((t) => t.translation)
    );
  }

  public getTranslationWithReplacements$(phrase: string, replacements: Replacements): Observable<string> {
    // Split the phrase into components first based on replacements
    const components = splitPhraseIntoComponents(phrase, replacements);

    // Translate each component individually using getTranslatedData and then combine them
    const translatedComponents$ = components.map((component) => this.getTranslatedData(component).pipe(
      map((translatedData) => translatedData.translation) // Extract the translated string
    ));

    return combineLatest(translatedComponents$).pipe(
      map((values: string[]) => values.join('')) // Join the strings without any separator
    );
  }

  public getTranslationWithYesOrNo$(phrase: string, yesOrNoValue: string): Observable<string> {
    if (yesOrNoValue == null) return of('');
    const isYes = yesOrNoValue.toLowerCase() === YesOrNoValue.YES.toLowerCase();

    return this.getTranslatedData(phrase).pipe(map((translatedData: TranslatedData) => {
      const yesOrNoTranslated = isYes ? (translatedData.yes || yesOrNoValue)
        : (translatedData.no || yesOrNoValue);
      return matchCase(yesOrNoValue!, yesOrNoTranslated);
    }
    ));
  }

  private getTranslatedData(phrase: string): Observable<TranslatedData> {
    if (Object.hasOwn(this.observables, phrase)) {
      return this.observables[phrase];
    }

    return this.translate(phrase);
  }

  private normalisePhraseSpacing(phrase: string): string {
    const safePhrase = phrase || '';
    if (safePhrase.trim().length === 0) {
      return phrase || '';
    }

    return safePhrase.trim().replace(/[^\S\r\n]+/g, ' ');
  }

  private translate(phrase: string): Observable<TranslatedData> {
    const lang = this.language;
    const lookupPhrase = this.normalisePhraseSpacing(phrase);
    // A phrase has one cache observer, belonging to its currently selected language.
    this.cacheSubscriptions[phrase]?.unsubscribe();
    delete this.cacheSubscriptions[phrase];
    if (!Object.hasOwn(this.phrases, phrase)) {
      this.phrases[phrase] = new BehaviorSubject<TranslatedData>({ translation: phrase });
      this.observables[phrase] = this.phrases[phrase].asObservable();
    }

    if (lang === 'en') {
      this.phrases[phrase].next({ translation: phrase });
    } else {
      this.cacheSubscriptions[phrase] = from(liveQuery(() => db.translations.where('[phrase+lang]').equals([lookupPhrase, lang]).first())).pipe(
        catchError(() => {
          if (!this.lifetime.closed) console.warn('Translation cache read failed');
          return of(undefined);
        }),
        tap((t) => {
          if (this.lifetime.closed || this.language !== lang) return;
          const cached = t && typeof t.translation === 'object' ? translationData(t.translation) : undefined;
          if (t && !t.isExpired() && cached) {
            this.phrases[phrase].next(cached);
          } else {
            if (t) {
              // Remove expired or invalid cache entries.
              void Promise.resolve(db.translations.delete(t.id!)).catch((): void => {
                if (!this.lifetime.closed) console.warn('Translation cache delete failed');
              });
            }
            this.phrases[phrase].next({
              translation: `${phrase} [Translation in progress]`,
              yes: 'Yes [Translation in progress]',
              no: 'No [Translation in progress]'
            });
            if (!this.lifetime.closed && this.language === lang) this.load(phrase, lang);
          }
        })
      ).subscribe(() => ({}));
      this.lifetime.add(this.cacheSubscriptions[phrase]);
    }

    return this.observables[phrase];
  }

  private shouldTranslate(phrase: string): boolean {
    if (!phrase || !/[a-zA-Z]/.test(phrase)) {
      return false;
    }

    if (phrase.includes('[Translation in progress]')) {
      return false;
    }

    // check if phrase consists of a placeholder only (eg ${key})
    if (/^\$\{[^}]+\}$/.test(phrase.trim())) {
      return false;
    }

    return true;
  }

  private load(phrase: string, lang: RpxLanguage): void {
    const lookupPhrase = this.normalisePhraseSpacing(phrase);

    if (lang === 'en' || !this.shouldTranslate(lookupPhrase)) {
      this.phrases[phrase].next({
        translation: phrase,
        yes: 'Yes',
        no: 'No'
      });
      return;
    }

    if (!this.requesting.hasOwnProperty(lang)) {
      this.requesting[lang] = [];
    }

    if (this.requesting[lang].indexOf(lookupPhrase) !== -1 || this.inFlight[lang]?.has(lookupPhrase)) {
      return;
    }

    // Prevent making a API call with empty array of phrase
    if (lookupPhrase.length === 0) {
      return;
    }

    this.requesting[lang].push(lookupPhrase);

    if (this.requestTimerSubscription) {
      this.requestTimerSubscription.unsubscribe();
    }

    this.requestTimerSubscription = timer(this.config.debounceTimeMs).subscribe(() => {
      const phrases = this.requesting[lang];
      this.requesting[lang] = [];
      this.requestTimerSubscription = null;
      const inFlight = this.inFlight[lang] ??= new Set<string>();
      phrases.forEach((p) => inFlight.add(p));
      const url = this.config.baseUrl + `/${lang}`;
      const fallback = (p: string): TranslatedData => this.config.testMode
        ? { translation: `[Test translation for ${p}]` } : { translation: p };
      const request = this.http.post<unknown>(url, { phrases }).pipe(
        map((response) => {
          const body = response && typeof response === 'object' && !Array.isArray(response) && Object.hasOwn(response, 'translations')
            ? (response as Record<string, unknown>)['translations'] : undefined;
          const translations = body && typeof body === 'object' && !Array.isArray(body)
            ? body as Record<string, unknown> : undefined;
          return phrases.map((p) => {
            const value = translations && Object.hasOwn(translations, p) ? translationData(translations[p]) : undefined;
            return { phrase: p, data: value ?? fallback(p), cache: value !== undefined };
          });
        }),
        catchError(() => of(phrases.map((p) => ({ phrase: p, data: fallback(p), cache: true })))),
        take(1),
        finalize(() => phrases.forEach((p) => inFlight.delete(p)))
      ).subscribe((translations) => {
        const toAdd: Translation[] = [];
        translations.forEach(({ phrase: p, data, cache }) => {
          if (cache) toAdd.push(Translation.create(p, lang, data, DateTime.now().plus(this.config.validity).toISO()));
          Object.keys(this.phrases)
            .filter((phraseKey) => this.language === lang && this.normalisePhraseSpacing(phraseKey) === p)
            .forEach((phraseKey) => {
              if (!this.lifetime.closed && this.language === lang) this.phrases[phraseKey].next(data);
            });
        });
        if (!this.lifetime.closed && toAdd.length) {
          void Promise.resolve(db.translations.bulkAdd(toAdd)).catch((): void => {
            if (!this.lifetime.closed) console.warn('Translation cache write failed');
          });
        }
      });
      this.lifetime.add(request);
    });
    this.lifetime.add(this.requestTimerSubscription);
  }

  private persistLanguage(): void {
    document.cookie = `${this.languageKey}=${this.currentLanguage}; SameSite=Strict;`;
  }

  private getPersistedLanguage(): RpxLanguage | undefined {
    const value = document.cookie.split(';').find((cookie) => cookie.trim().startsWith(this.languageKey + '='))?.split('=')[1].trim();
    return value === 'en' || value === 'cy' ? value : undefined;
  }
}
