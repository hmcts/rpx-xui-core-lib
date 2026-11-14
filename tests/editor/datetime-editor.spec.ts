import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NgxMatDatepickerActions, NgxMatDatepickerApply, NgxMatDatepickerInput, NgxMatDatepickerToggle, NgxMatDatetimepicker } from '@ngxmc/datetime-picker';
import { DatetimePickerComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/datetime-picker/datetime-picker.component';
import { FormatTranslatorService } from '../../projects/core-lib/case/editor-source/lib/shared/services/case-fields/format-translator.service';

export const registered = true;
@Pipe({ name: 'rpxTranslate', standalone: false }) class TranslatePipe implements PipeTransform { transform(v: unknown) { return v; } }
@Pipe({ name: 'ccdFieldLabel', standalone: false }) class FieldLabelPipe implements PipeTransform { transform(v: { label: string }) { return v.label; } }
@Pipe({ name: 'ccdFirstError', standalone: false }) class ErrorPipe implements PipeTransform { transform(v: unknown) { return v; } }

describe('Editor datetime component', () => {
  it('renders the real editor template and opens the calendar', async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, MatButtonModule, NgxMatDatepickerActions, NgxMatDatepickerApply, NgxMatDatepickerInput, NgxMatDatepickerToggle, NgxMatDatetimepicker],
      declarations: [DatetimePickerComponent, TranslatePipe, FieldLabelPipe, ErrorPipe],
      providers: [provideNoopAnimations(), { provide: FormatTranslatorService, useValue: { showOnlyDates: () => 'DD/MM/YYYY', removeTime: (v: string) => v, hasDate: () => true } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(DatetimePickerComponent);
    fixture.componentInstance.caseField = { id: 'date', label: 'Date', field_type: { type: 'Date' }, value: '' } as unknown as typeof fixture.componentInstance.caseField;
    fixture.componentInstance.formGroup = new FormGroup({});
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ngx-mat-datepicker-toggle button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(document.querySelector('ngx-mat-calendar .mat-calendar-body-cell')).not.toBeNull();
    const day = document.querySelector('ngx-mat-calendar .mat-calendar-body-active') as HTMLElement;
    day.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const confirm = Array.from(document.querySelectorAll('button')).find(element => element.textContent.trim() === 'Confirm');
    expect(confirm).toBeDefined();
    confirm.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.dateControl.value).toBeTruthy();
    expect(fixture.componentInstance.formGroup.get('date').value).toEqual(fixture.componentInstance.dateControl.value);
  });
});
