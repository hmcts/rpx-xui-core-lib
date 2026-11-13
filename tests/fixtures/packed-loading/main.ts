import { Component, Type, signal, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { FindWorkTypeModule } from '@hmcts/rpx-xui-core-lib/ui/find-work-type';
import type { FilterFieldConfig } from '@hmcts/rpx-xui-core-lib/ui/search-location';
import { NgComponentOutlet } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';
import type { WorkType } from '@hmcts/rpx-xui-core-lib/ui/task-data';

@Component({
  selector: 'loading-proof', imports: [NgComponentOutlet, ReactiveFormsModule, FindWorkTypeModule],
  template: `<main><h1>Selective loading proof</h1><form [formGroup]="form"><label><input type="checkbox" formControlName="choice"> Choice</label></form>
    <p data-testid="validity">{{form.valid ? 'valid' : 'invalid'}}</p>
    <xuilib-find-work-type [form]="workForm" [fields]="fields" [field]="workTypeField" [services]="services" workTypeTitle="Search work types" [enableAddWorkTypeButton]="false"></xuilib-find-work-type>
    <output data-testid="selected-work-type">{{workForm.controls.workTypes.controls[0]?.value?.label}}</output>
    <button (click)="loadDate()">Load date</button><button (click)="loadSession()">Load session error</button>
    <ng-container *ngComponentOutlet="page()" /></main>`,
})
class LoadingProof {
  form = new FormGroup({ choice: new FormControl(false, { nonNullable: true }) }, checkboxesBeCheckedValidator());
  workForm = new FormGroup({ workTypes: new FormArray<FormControl<WorkType | null>>([]) });
  fields: FilterFieldConfig[] = [{ name: 'services', options: [{ key: 'ia', label: 'IA' }], minSelected: 0, maxSelected: 1, type: 'checkbox' }];
  workTypeField: FilterFieldConfig = { name: 'workTypes', options: [], minSelected: 0, maxSelected: 1, type: 'find-work-type', findLocationField: 'services' };
  services = ['ia'];
  page = signal<Type<unknown> | null>(null);
  async loadDate() { this.page.set((await import('./date-page')).DatePage); }
  async loadSession() { this.page.set((await import('./session-page')).SessionPage); }
}
bootstrapApplication(LoadingProof, { providers: [provideZonelessChangeDetection(), provideHttpClient(), importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/synthetic', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
