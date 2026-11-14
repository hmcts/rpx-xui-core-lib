import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LinkCasesComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/link-cases/link-cases.component';
import { CasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/cases.service';
import { LinkedCasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/services/linked-cases.service';
import { ValidatorsUtils } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/utils/validators.utils';
import { MultipageComponentStateService } from '../../projects/core-lib/case/editor-source/lib/shared/services/journey/multipage-component-state.service';

@Pipe({ name: 'ccdCaseReference', standalone: false })
class CaseReferenceStub implements PipeTransform { transform(value: unknown) { return value; } }
@Pipe({ name: 'ccdLinkCasesReasonValue', standalone: false })
class LinkReasonStub implements PipeTransform { transform(value: unknown) { return value; } }

export const registered = true;

describe('Linked case reasons migration contract', () => {
  it('labels case reference and comments and keeps form IDs unique', async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [LinkCasesComponent, CaseReferenceStub, LinkReasonStub],
      providers: [FormBuilder, ValidatorsUtils, { provide: CasesService, useValue: {} },
        { provide: LinkedCasesService, useValue: { caseId: '123', caseName: 'Case', linkCaseReasons: [], linkedCases: [], initialCaseLinks: [], caseFieldValue: [] } },
        { provide: MultipageComponentStateService, useValue: { addTojourneyCollection: () => {}, setJourneyState: () => {} } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(LinkCasesComponent);
    fixture.detectChanges();
    fixture.componentInstance.showComments = true;
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const reference = root.querySelector<HTMLInputElement>('[formControlName="caseNumber"]');
    const comments = root.querySelector<HTMLTextAreaElement>('[formControlName="otherDescription"]');
    expect(reference?.labels?.[0]?.textContent.trim()).toBe('Enter case reference');
    expect(comments?.labels?.[0]?.textContent.trim()).toBe('Comments');
    const ids = Array.from(root.querySelectorAll('[id]'), element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(root.querySelectorAll('#caseNumber').length).toBe(1);
    fixture.destroy();
  });
  it('retains distinct display and CCD collection shapes for selected reasons', () => {
    const component = Object.create(LinkCasesComponent.prototype);
    component.linkCaseForm = new FormGroup({ reasonType: new FormControl([{ key: 'OTHER', value_en: 'Other', selected: true }, { key: 'IGNORED', selected: false }]), otherDescription: new FormControl('Details') });
    expect(component.getSelectedCaseReasons()).toEqual([{ Reason: 'OTHER', OtherDescription: 'Details' }]);
    expect(component.getSelectedCCDTypeCaseReason()).toEqual([{ value: { Reason: 'OTHER', OtherDescription: 'Details' } }]);
  });
  it('removes the selected case from all three journey lists', () => {
    const component = Object.create(LinkCasesComponent.prototype);
    component.selectedCases = [{ caseReference: 'A' }, { caseReference: 'B' }];
    component.linkedCasesService = {
      caseFieldValue: [{ value: { CaseReference: 'A' } }, { value: { CaseReference: 'B' } }],
      linkedCases: [{ caseReference: 'A' }, { caseReference: 'B' }]
    };
    component.onSelectedLinkedCaseRemove(0, 'A');
    expect(component.selectedCases).toEqual([{ caseReference: 'B' }]);
    expect(component.linkedCasesService.caseFieldValue).toEqual([{ value: { CaseReference: 'B' } }]);
    expect(component.linkedCasesService.linkedCases).toEqual([{ caseReference: 'B' }]);
  });

});
