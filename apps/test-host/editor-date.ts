import { Component, NgModule, importProvidersFrom } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { DateInputModule } from '@hmcts/rpx-xui-core-lib/case/editor-date';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';

@NgModule({ imports: [DateInputModule], exports: [DateInputModule] })
class SimulatedEditorFormModule {}

@Component({ selector: 'core-editor-date-host', imports: [SimulatedEditorFormModule, ReactiveFormsModule],
  template: `<main><h1>Editor date input</h1><button (click)="translation.language='cy'">Cymraeg</button><button (click)="translation.language='en'">English</button>
    <cut-date-input id="synthetic-date" [mandatory]="true" [isDateTime]="false" [isInvalid]="date.invalid && date.touched" [formControl]="date"></cut-date-input>
    <button (click)="date.markAsTouched()">Validate</button><p data-testid="value">{{date.value}}</p><p data-testid="valid">{{date.valid}}</p></main>` })
class DateGallery {
  readonly date = new FormControl('');
  constructor(public translation: RpxTranslationService) {}
}

export function startEditorDateGallery() {
  return bootstrapApplication(DateGallery, { providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
}
