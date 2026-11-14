import { Component, EventEmitter, Input, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CaseEditComponent, CaseEditConfirmComponent } from '@hmcts/rpx-xui-core-lib/case/editor-source';

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform { transform(value: string): string { return value; } }
@Pipe({ name: 'ccdCaseTitle', standalone: false })
class TitleStub implements PipeTransform { transform(value: string): string { return value; } }
@Pipe({ name: 'ccdCaseReference', standalone: false })
class ReferenceStub implements PipeTransform { transform(value: string): string { return value; } }
@Component({ selector: 'ccd-markdown', template: '', standalone: false })
class MarkdownStub { @Input() content: unknown; }

describe('case confirmation rendering', () => {
  it('binds its form and submits through the rendered button', () => {
    const submitted = new EventEmitter();
    const emit = spyOn(submitted, 'emit');
    TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [CaseEditConfirmComponent, TranslateStub, TitleStub, ReferenceStub, MarkdownStub],
      providers: [
        { provide: CaseEditComponent, useValue: { eventTrigger: { name: 'Test', case_fields: [] }, form: new FormGroup({}), submitted, confirmation: { getCaseId: () => '123', getStatus: () => 'complete', getHeader: () => '', getBody: () => '' } } },
        { provide: Router, useValue: {} }
      ]
    });
    const fixture = TestBed.createComponent(CaseEditConfirmComponent);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(emit).toHaveBeenCalledOnceWith({ caseId: '123', status: 'complete' });
  });
});
export const registered = true;
