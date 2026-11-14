import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { CaseChallengedAccessRequestComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-challenged-access-request/case-challenged-access-request.component';
import { CaseNotifier, CasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor';

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform { transform(value: string): string { return value; } }

describe('Challenged access accessibility', () => {
  it('names the conditional reason field and links its validation error', async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [CaseChallengedAccessRequestComponent, TranslateStub],
      providers: [FormBuilder, { provide: Router, useValue: {} }, { provide: ActivatedRoute, useValue: {} },
        { provide: CasesService, useValue: {} }, { provide: CaseNotifier, useValue: {} },
        { provide: Title, useValue: { getTitle: () => 'Case', setTitle: () => {} } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(CaseChallengedAccessRequestComponent);
    fixture.detectChanges();
    fixture.componentInstance.formGroup.get('radioSelected').setValue(fixture.componentInstance.accessReasons[3].reason);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#other-reason') as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-labelledby')).toBe('reason-3-label');
    expect(fixture.nativeElement.querySelector('#reason-3-label').textContent.trim()).toBe('Other reason');
    fixture.componentInstance.submitted = true;
    fixture.componentInstance.errorMessage = { title: 'Error', description: 'Enter a reason', fieldId: 'other-reason' };
    fixture.componentInstance.formGroup.get('otherReason').setErrors({ required: true });
    fixture.detectChanges();
    expect(input.getAttribute('aria-describedby')).toContain('other-reason-error-message');
    fixture.destroy();
  });
});
