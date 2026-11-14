import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NgxMatDatepickerInput, NgxMatDatepickerToggle, NgxMatDatetimepicker } from '@ngxmc/datetime-picker';

export const registered = true;

@Component({ standalone: true, imports: [NgxMatDatepickerInput, NgxMatDatepickerToggle, NgxMatDatetimepicker], template: '<input [ngxMatDatetimePicker]="picker"><ngx-mat-datepicker-toggle [for]="picker"></ngx-mat-datepicker-toggle><ngx-mat-datetime-picker #picker></ngx-mat-datetime-picker>' })
class DateToggleHost {}

Object.assign(globalThis, {
  createDatetimeToggleHost: async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [DateToggleHost], providers: [provideNativeDateAdapter(), provideNoopAnimations()] }).compileComponents();
    const fixture = TestBed.createComponent(DateToggleHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    Object.assign(globalThis, { refreshDatetimeToggleHost: () => fixture.detectChanges() });
    return true;
  }
});

describe('Datetime toggle integration', () => {
  it('focuses the toggle and opens the picker on click', async () => {
    await TestBed.configureTestingModule({ imports: [DateToggleHost], providers: [provideNativeDateAdapter(), provideNoopAnimations()] }).compileComponents();
    const fixture = TestBed.createComponent(DateToggleHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ngx-mat-datepicker-toggle button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.disabled).toBeFalse();
    button.focus();
    expect(document.activeElement).toBe(button);
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('ngx-mat-calendar')).not.toBeNull();
  });
});
