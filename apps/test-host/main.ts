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

const application = window.location.pathname === '/spinner'
  ? import('./spinner').then(({ startSpinnerGallery }) => startSpinnerGallery())
  : window.location.pathname === '/translation'
  ? import('./translation').then(({ startTranslationGallery }) => startTranslationGallery())
  : bootstrapApplication(ValidationGallery);
application.catch((error: unknown) => console.error(error));
