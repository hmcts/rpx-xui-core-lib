import { UpdateFlagTitleDisplayPipe } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/pipes/update-flag-title-display.pipe';
import { LanguageInterpreterDisplayPipe } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/pipes/language-interpreter-display.pipe';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { FlagFieldDisplayPipe } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/pipes/flag-field-display.pipe';

export const registered = true;

describe('Flag display migration contract', () => {
  it('switches languages and falls back when a translation is absent', () => {
    const language$ = new BehaviorSubject('en');
    const pipe = TestBed.runInInjectionContext(() => new FlagFieldDisplayPipe({ language$ } as unknown as ConstructorParameters<typeof FlagFieldDisplayPipe>[0], { markForCheck() {} } as unknown as ConstructorParameters<typeof FlagFieldDisplayPipe>[1]));
    const value = { flagCode: 'F', name: 'English', name_cy: 'Cymraeg' };
    expect(pipe.transform(value, 'name')).toBe('English');
    language$.next('cy');
    expect(pipe.transform(value, 'name')).toBe('Cymraeg');
    const fallback = { flagCode: 'G', name: 'Fallback', name_cy: '' };
    expect(pipe.transform(fallback, 'name')).toBeNull();
    expect(pipe.transform(fallback, 'name')).toBe('Fallback');
    pipe.ngOnDestroy();
  });
  it('shows interpreter language in the selected language with fallback', () => {
    const language$ = new BehaviorSubject('cy');
    const pipe = TestBed.runInInjectionContext(() => new LanguageInterpreterDisplayPipe({ language$ } as unknown as ConstructorParameters<typeof LanguageInterpreterDisplayPipe>[0], { markForCheck() {} } as unknown as ConstructorParameters<typeof LanguageInterpreterDisplayPipe>[1]));
    const value = { key: 'lang', value: 'English', value_cy: 'Cymraeg' };
    expect(pipe.transform(value)).toBe('Cymraeg');
    language$.next('en');
    expect(pipe.transform(value)).toBe('English');
    const fallback = { key: 'fallback', value: 'Fallback', value_cy: '' };
    language$.next('cy');
    const fallbackPipe = TestBed.runInInjectionContext(() => new LanguageInterpreterDisplayPipe({ language$ } as unknown as ConstructorParameters<typeof LanguageInterpreterDisplayPipe>[0], { markForCheck() {} } as unknown as ConstructorParameters<typeof LanguageInterpreterDisplayPipe>[1]));
    expect(fallbackPipe.transform(fallback)).toBe('Fallback');
    fallbackPipe.ngOnDestroy();
    pipe.ngOnDestroy();
  });

  it('updates when an existing interpreter pipe receives a different language', () => {
    const language$ = new BehaviorSubject('en');
    const pipe = TestBed.runInInjectionContext(() => new LanguageInterpreterDisplayPipe({ language$ } as unknown as ConstructorParameters<typeof LanguageInterpreterDisplayPipe>[0], { markForCheck() {} } as unknown as ConstructorParameters<typeof LanguageInterpreterDisplayPipe>[1]));
    expect(pipe.transform({ key: 'one', value: 'First', value_cy: 'Un' })).toBe('First');
    expect(pipe.transform({ key: 'two', value: 'Second', value_cy: 'Dau' })).toBe('Second');
    pipe.ngOnDestroy();
  });

  it('updates the flag title when the existing pipe receives a different flag', () => {
    const language$ = new BehaviorSubject('en');
    const translation = { language$, language: 'en' };
    const pipe = TestBed.runInInjectionContext(() => new UpdateFlagTitleDisplayPipe(translation as unknown as ConstructorParameters<typeof UpdateFlagTitleDisplayPipe>[0], { markForCheck() {} } as unknown as ConstructorParameters<typeof UpdateFlagTitleDisplayPipe>[1]));
    expect(pipe.transform({ flagCode: 'one', name: 'First' })).toBe('First');
    expect(pipe.transform({ flagCode: 'two', name: 'Second' })).toBe('Second');
    pipe.ngOnDestroy();
  });

});
