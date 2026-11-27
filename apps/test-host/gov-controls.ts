import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovTextareaModule } from '@hmcts/rpx-xui-core-lib/ui/gov-textarea';
import { GovCheckboxesModule } from '@hmcts/rpx-xui-core-lib/ui/gov-checkboxes';
import { GovRadiosModule } from '@hmcts/rpx-xui-core-lib/ui/gov-radios';
import { GovFileUploadModule } from '@hmcts/rpx-xui-core-lib/ui/gov-file-upload';
@Component({ selector: 'core-test-host', imports: [GovTextareaModule, GovCheckboxesModule, GovRadiosModule, GovFileUploadModule], template: `
<main><h1>Form control migration</h1><button type="button" (click)="showErrors()">Show errors</button><button type="button" (click)="clearErrors()">Clear errors</button><button type="button" (click)="emptyErrors()">Empty errors</button><button type="button" (click)="form.reset()">Reset form</button>
<xuilib-gov-uk-textarea [group]="form" [config]="notes" [errorMessage]="error" />
<xuilib-gov-uk-textarea [group]="form" [config]="otherNotes" [errorMessage]="error" />
<xuilib-gov-uk-checkboxes [group]="form" [config]="choices" [items]="items" [errorMessage]="error" />
<xuilib-gov-uk-radios [options]="radios" [errors]="error" />
<xuilib-gov-uk-file-upload [group]="form" [config]="file" [errorMessage]="error" />
<output data-testid="notes-value">{{form.controls.notes.value}}</output>
<output data-testid="choices-value">{{form.controls.choices.value?.join(',')}}</output>
<output data-testid="radio-value">{{form.controls.answer.value}}</output>
<output data-testid="file-value">{{form.controls.document.value}}</output></main>` })
class GovControlsGallery {
  form = new FormGroup({ notes: new FormControl(''), other: new FormControl(''), choices: new FormControl<string[]>([]), answer: new FormControl(''), document: new FormControl('') });
  notes = { id: 'notes', key: 'notes', label: 'Notes', hint: 'Notes help', rows: 3 };
  otherNotes = { id: 'other', key: 'other', label: 'Other notes', hint: 'Other help', rows: 3 };
  choices = { id: 'choices', name: 'choices', label: 'Choices', hint: 'Choose any', rows: 2 };
  items = [{ id: 'first', value: 'first', label: 'First choice' }, { id: 'second', value: 'second', label: 'Second choice' }];
  radios = { key: 'answer', group: this.form, config: { id: 'answer', key: 'answer', legend: 'Answer', hint: 'Choose one' }, errors: null,
    items: [{ id: 'yes', name: 'answer', value: 'yes', label: 'Yes' }, { id: 'no', name: 'answer', value: 'no', label: 'No' }] };
  file = { id: 'document', name: 'document', label: 'Document', hint: 'Choose a synthetic document' };
  error = { isInvalid: false, messages: [] as string[] };
  clearErrors() { this.error = { isInvalid: false, messages: [] }; }
  emptyErrors() { this.error = { isInvalid: true, messages: [] }; }
  showErrors() { this.error = { isInvalid: true, messages: ['Required'] }; }
}
export function startGovControlsGallery() {
  return bootstrapApplication(GovControlsGallery, { providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
}
