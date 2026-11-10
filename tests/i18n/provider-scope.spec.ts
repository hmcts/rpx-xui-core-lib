import { Component, EnvironmentInjector, createEnvironmentInjector, importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RpxTranslationModule, RpxTranslationService, RpxTranslationConfig } from '../../projects/core-lib/i18n/public-api';

@Component({ imports: [RpxTranslationModule], template: '<p>{{ "Hello world" | rpxTranslate }}</p>' })
class TranslationView {}

describe('canonical translation provider scope', () => {
  const config: RpxTranslationConfig = { baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false };

  beforeEach(() => {
    document.cookie = 'exui-preferred-language=en; SameSite=Strict;';
    TestBed.configureTestingModule({ imports: [RpxTranslationModule.forRoot(config), TranslationView] });
  });

  it('forChild inherits the root service and configuration identities', () => {
    const parent = TestBed.inject(EnvironmentInjector);
    const child = createEnvironmentInjector([importProvidersFrom(RpxTranslationModule.forChild())], parent);
    try {
      expect(child.get(RpxTranslationService)).toBe(TestBed.inject(RpxTranslationService));
      expect(child.get(RpxTranslationConfig)).toBe(config);
      expect(RpxTranslationModule.forChild().providers).toBeUndefined();
    } finally {
      child.destroy();
    }
  });

  it('a child injector can override configuration without replacing the root service', () => {
    const override = { ...config, baseUrl: '/child-translations' };
    const child = createEnvironmentInjector([{ provide: RpxTranslationConfig, useValue: override }], TestBed.inject(EnvironmentInjector));
    try {
      expect(child.get(RpxTranslationConfig)).toBe(override);
      expect(child.get(RpxTranslationService)).toBe(TestBed.inject(RpxTranslationService));
    } finally {
      child.destroy();
    }
  });

  it('renders the real public pipe through the root module', () => {
    const fixture = TestBed.createComponent(TranslationView);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('Hello world');
    fixture.destroy();
  });
});
