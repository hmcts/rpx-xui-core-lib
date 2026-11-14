import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { CaseReviewSpecificAccessRequestComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-review-specific-access-request/case-review-specific-access-request.component';

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform { transform(value: string): string { return value; } }

describe('Specific access review accessibility', () => {
  it('labels the page and radio group with direct legends and retains validation', async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [CaseReviewSpecificAccessRequestComponent, TranslateStub],
      providers: [FormBuilder, { provide: ActivatedRoute, useValue: { snapshot: { data: { case: { case_id: '123' } } } } },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: AbstractAppConfig, useValue: { getAccessManagementRequestReviewMockModel: () => ({ active: true, details: { caseName: 'Example', caseReference: '123', dateSubmitted: '2026-01-01', requestFrom: 'User', reasonForCaseAccess: 'Other' } }) } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(CaseReviewSpecificAccessRequestComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const fieldsets = root.querySelectorAll('fieldset');
    expect(fieldsets.length).toBe(2);
    const outerLegend = fieldsets[0].querySelector(':scope > legend');
    const radioLegend = fieldsets[1].querySelector(':scope > legend');
    expect(outerLegend?.textContent?.trim()).toBe('Review specific access request');
    expect(radioLegend?.textContent?.trim()).toBe('What do you want to do with this request?');
    expect(fieldsets[0].hasAttribute('aria-describedby')).toBeFalse();
    const radios = root.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios.length).toBe(3);
    expect(Array.from(radios, radio => radio.labels?.[0]?.textContent.trim())).toEqual(['Approve request', 'Reject request', 'Request more information']);
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(root.querySelector('#error-message')?.textContent?.trim()).toBe('Select an option');
    expect(radios[0].getAttribute('aria-describedby')).toBe('error-message');
    radios[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.formGroup.valid).toBeTrue();
    expect(fixture.componentInstance.formGroup.get('radioSelected').value).toBe('Approve request');
    fixture.destroy();
  });
});
