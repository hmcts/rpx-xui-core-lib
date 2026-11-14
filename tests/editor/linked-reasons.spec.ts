import { FormControl, FormGroup } from '@angular/forms';
import { LinkCasesComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/link-cases/link-cases.component';

export const registered = true;

describe('Linked case reasons migration contract', () => {
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
