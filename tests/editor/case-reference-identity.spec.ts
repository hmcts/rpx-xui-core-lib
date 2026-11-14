import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CaseReferenceModule, CaseReferencePipe as CoreReferencePipe } from '@hmcts/rpx-xui-core-lib/case/reference';
import { CaseReferencePipe as EditorReferencePipe } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/case-reference/case-reference.pipe';
import { PipesModule } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/pipes.module';

export const registered = true;

@Component({ template: '{{ reference | ccdCaseReference }}', standalone: true, imports: [PipesModule, CaseReferenceModule] })
class ReferenceHost { reference = '1234567890123456'; }

describe('Case reference shared identity', () => {
  it('uses the same pipe class across editor and Core entry points', () => {
    expect(EditorReferencePipe).toBe(CoreReferencePipe);
  });
  it('renders both formatted references and drafts with both modules imported', async () => {
    await TestBed.configureTestingModule({ imports: [ReferenceHost] }).compileComponents();
    const fixture = TestBed.createComponent(ReferenceHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1234-5678-9012-3456');
    fixture.componentInstance.reference = 'DRAFT123';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('DRAFT');
  });
});
