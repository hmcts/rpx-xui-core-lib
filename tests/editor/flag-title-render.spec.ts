import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { UpdateFlagTitleDisplayPipe } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/pipes/update-flag-title-display.pipe';

export const registered = true;
@Component({ template: '', standalone: false })
class FlagTitleHost { flag = { flagCode: 'one', name: 'First' }; }

describe('Flag title rendering contract', () => {
  it('updates the displayed title when the existing view receives another flag', async () => {
    const language$ = new BehaviorSubject('en');
    await TestBed.configureTestingModule({ declarations: [FlagTitleHost, UpdateFlagTitleDisplayPipe], providers: [{ provide: RpxTranslationService, useValue: { language$, language: 'en' } }] }).compileComponents();
    TestBed.overrideTemplate(FlagTitleHost, '<span>{{ flag | updateFlagTitleDisplay }}</span>');
    const fixture = TestBed.createComponent(FlagTitleHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('First');
    fixture.componentInstance.flag = { flagCode: 'two', name: 'Second' };
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Second');
  });
});
