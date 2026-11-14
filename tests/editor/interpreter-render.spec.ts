import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { LanguageInterpreterDisplayPipe } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/pipes/language-interpreter-display.pipe';

export const registered = true;
@Component({ template: '', standalone: false })
class InterpreterHost {
  language = { key: 'one', value: 'First', value_cy: 'Un' };
}

describe('Interpreter language rendering contract', () => {
  it('updates the displayed language when the existing view receives another option', async () => {
    const language$ = new BehaviorSubject('en');
    await TestBed.configureTestingModule({ declarations: [InterpreterHost, LanguageInterpreterDisplayPipe], providers: [{ provide: RpxTranslationService, useValue: { language$ } }] }).compileComponents();
    TestBed.overrideTemplate(InterpreterHost, '<span>{{ language | languageInterpreterDisplay }}</span>');
    const fixture = TestBed.createComponent(InterpreterHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('First');
    fixture.componentInstance.language = { key: 'two', value: 'Second', value_cy: 'Dau' };
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Second');
    language$.next('cy');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Dau');
  });
});
