import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NgxMatDatepickerInput, NgxMatDatepickerToggle, NgxMatDatetimepicker } from '@ngxmc/datetime-picker';

@Component({ standalone: true, imports: [NgxMatDatepickerInput, NgxMatDatepickerToggle, NgxMatDatetimepicker], template: '<input [ngxMatDatetimePicker]="picker"><ngx-mat-datepicker-toggle [for]="picker"></ngx-mat-datepicker-toggle><ngx-mat-datetime-picker #picker></ngx-mat-datetime-picker>' })
class DateToggleHost {}

let fixture: ComponentFixture<DateToggleHost>;

export async function createDatetimeToggleHost() {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [DateToggleHost], providers: [provideNativeDateAdapter(), provideNoopAnimations()] }).compileComponents();
  fixture = TestBed.createComponent(DateToggleHost);
  document.body.appendChild(fixture.nativeElement);
  fixture.autoDetectChanges();
  return fixture;
}

export function refreshDatetimeToggleHost() {
  fixture.detectChanges();
}
