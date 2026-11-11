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

const application = window.location.pathname === '/accessibility'
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
