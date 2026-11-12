import { Component, Type, signal, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { NgComponentOutlet } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

@Component({
  selector: 'loading-proof', imports: [NgComponentOutlet, ReactiveFormsModule],
  template: `<main><h1>Selective loading proof</h1><form [formGroup]="form"><label><input type="checkbox" formControlName="choice"> Choice</label></form>
    <p data-testid="validity">{{form.valid ? 'valid' : 'invalid'}}</p>
    <button (click)="loadDate()">Load date</button><button (click)="loadSession()">Load session error</button>
    <ng-container *ngComponentOutlet="page()" /></main>`,
})
class LoadingProof {
  form = new FormGroup({ choice: new FormControl(false, { nonNullable: true }) }, checkboxesBeCheckedValidator());
  page = signal<Type<unknown> | null>(null);
  async loadDate() { this.page.set((await import('./date-page')).DatePage); }
  async loadSession() { this.page.set((await import('./session-page')).SessionPage); }
}
bootstrapApplication(LoadingProof, { providers: [provideZonelessChangeDetection(), provideHttpClient(), importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/synthetic', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
