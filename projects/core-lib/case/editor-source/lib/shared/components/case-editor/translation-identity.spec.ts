import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { LanguageInterpreterDisplayPipe } from '../palette/case-flag/pipes/language-interpreter-display.pipe';

describe('editor translation identity', () => {
  it('uses the canonical Core module and service', () => {
    const service = {};
    TestBed.configureTestingModule({ providers: [
      LanguageInterpreterDisplayPipe,
      { provide: RpxTranslationService, useValue: service },
      { provide: ChangeDetectorRef, useValue: { markForCheck() {} } }
    ] });
    expect(RpxTranslationModule.forChild().ngModule).toBe(RpxTranslationModule);
    const pipe = TestBed.inject(LanguageInterpreterDisplayPipe);
    expect((pipe as unknown as { translationService: unknown }).translationService).toBe(service);
  });
});

export const registered = true;
