import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RpxTranslatePipe } from '../../../projects/core-lib/i18n/lib/rpx-translate.pipe';
import { RpxTranslationService } from '../../../projects/core-lib/i18n/lib/rpx-translation.service';
import { of } from 'rxjs';

describe('RpxTranslatePipe', () => {
  let translationServiceMock: {
    getTranslationWithReplacements$: Mock;
    getTranslationWithYesOrNo$: Mock;
    getTranslation$: Mock;
  };
  let pipe: RpxTranslatePipe;

  beforeEach(() => {
    translationServiceMock = {
      getTranslationWithReplacements$: vi.fn(),
      getTranslationWithYesOrNo$: vi.fn(),
      getTranslation$: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RpxTranslatePipe,
        { provide: RpxTranslationService, useValue: translationServiceMock },
        { provide: ChangeDetectorRef, useValue: {
          markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn()
        } }
      ]
    });

    pipe = TestBed.inject(RpxTranslatePipe);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform', () => {
    it('should return null when called with null or undefined', () => {
      expect(pipe.transform(null)).toBeNull();
      expect(pipe.transform(undefined)).toBeNull();
    });

    it('should return the same string when called with a string', () => {
      translationServiceMock.getTranslation$.mockImplementation((someString) => of(someString));

      const translationString = 'Hello World!';
      expect(pipe.transform(translationString)).toBe(translationString);
    });

    it('should call getTranslation with the string argument when no replacements or yesOrNo are provided', () => {
      const str = 'Hello world!';
      const obs = of('Translated string');
      translationServiceMock.getTranslation$.mockReturnValue(obs);

      pipe.transform(str);

      expect(translationServiceMock.getTranslation$).toHaveBeenCalledWith(str);
    });

    it('should call getTranslationWithReplacements with the string and replacements arguments when replacements are provided', () => {
      const str = 'Hello world!';
      const replacements = { name: 'John' };
      const obs = of('Translated string');
      translationServiceMock.getTranslationWithReplacements$.mockReturnValue(obs);

      pipe.transform(str, replacements);

      expect(translationServiceMock.getTranslationWithReplacements$).toHaveBeenCalledWith(str, replacements);
    });

    it('passes explicit literal replacements to the service', () => {
      translationServiceMock.getTranslationWithReplacements$.mockReturnValue(of('result'));
      pipe.transform('Hello %name%', null, undefined, { name: 'Fictional Person' });
      expect(translationServiceMock.getTranslationWithReplacements$).toHaveBeenCalledWith(
        'Hello %name%', {}, { name: 'Fictional Person' }
      );
    });

    it('should call getYesTranslationReplacement with the string and yesOrNo argument when yesOrNo is "yes"', () => {
      const str = 'Are you sure?';
      const yesOrNo = 'Yes';
      const obs = of('Translated string');
      translationServiceMock.getTranslationWithYesOrNo$.mockReturnValue(obs);

      pipe.transform(str, null, yesOrNo);

      expect(translationServiceMock.getTranslationWithYesOrNo$).toHaveBeenCalledWith(str, yesOrNo);
    });

    it('should call getNoTranslationReplacement with the string and yesOrNo argument when yesOrNo is "no"', () => {
      const str = 'Are you sure?';
      const yesOrNo = 'No';
      const obs = of('Translated string');
      translationServiceMock.getTranslationWithYesOrNo$.mockReturnValue(obs);

      pipe.transform(str, null, yesOrNo);

      expect(translationServiceMock.getTranslationWithYesOrNo$).toHaveBeenCalledWith(str, yesOrNo);
    });
  });
});
