import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

@Component({
  selector: 'core-test-host',
  imports: [ReactiveFormsModule],
  templateUrl: './validation.html',
  styleUrl: './validation.css',
})
class ValidationGallery {
  readonly form = new FormGroup({
    first: new FormControl(false, { nonNullable: true }),
    second: new FormControl(false, { nonNullable: true }),
  }, checkboxesBeCheckedValidator());
  submitted = false;
}

const application = window.location.pathname === '/terms-display'
  ? import('./terms-display').then(({ startTermsDisplayGallery }) => startTermsDisplayGallery())
  : window.location.pathname === '/search-location'
  ? import('./search-location').then(({ startSearchLocationGallery }) => startSearchLocationGallery())
  : window.location.pathname === '/session-error'
  ? import('./session-error').then(({ startSessionErrorGallery }) => startSessionErrorGallery())
  : window.location.pathname === '/editor-date'
  ? import('./editor-date').then(({ startEditorDateGallery }) => startEditorDateGallery())
  : window.location.pathname === '/window'
  ? import('./window').then(({ startWindowGallery }) => startWindowGallery())
  : window.location.pathname.startsWith('/session-storage')
  ? import('./session-storage').then(({ startSessionStorageGallery }) => startSessionStorageGallery())
  : window.location.pathname.startsWith('/cookie')
  ? import('./cookie').then(({ startCookieGallery }) => startCookieGallery())
  : window.location.pathname === '/feature-toggle'
  ? import('./feature-toggle').then(({ startFeatureToggleGallery }) => startFeatureToggleGallery())
  : window.location.pathname === '/primitives'
  ? import('./primitives').then(({ startPrimitivesGallery }) => startPrimitivesGallery())
  : window.location.pathname === '/session-dialog'
  ? import('./session-dialog').then(({ startSessionDialogGallery }) => startSessionDialogGallery())
  : window.location.pathname === '/accessibility'
  ? import('./accessibility').then(({ startAccessibilityGallery }) => startAccessibilityGallery())
  : window.location.pathname === '/due-date'
  ? import('./due-date').then(({ startDueDateGallery }) => startDueDateGallery())
  : window.location.pathname === '/case-reference'
  ? import('./case-reference').then(({ startCaseReferenceGallery }) => startCaseReferenceGallery())
  : window.location.pathname === '/contact'
  ? import('./contact').then(({ startContactGallery }) => startContactGallery())
  : window.location.pathname === '/spinner'
  ? import('./spinner').then(({ startSpinnerGallery }) => startSpinnerGallery())
  : window.location.pathname === '/translation'
  ? import('./translation').then(({ startTranslationGallery }) => startTranslationGallery())
  : bootstrapApplication(ValidationGallery);
application.catch((error: unknown) => console.error(error));
