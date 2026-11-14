import { throwError } from 'rxjs';
import { EventEmitter } from '@angular/core';
import { UnLinkCasesComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/unlink-cases/unlink-cases.component';

export const registered = true;

describe('Unlink case migration contract', () => {
  it('accepts both standard and challenged-access case identifiers', () => {
    const component = Object.create(UnLinkCasesComponent.prototype);
    expect(component.getLinkedCaseId({ caseReference: 'standard', id: 'other' })).toBe('standard');
    expect(component.getLinkedCaseId({ id: 'challenged' })).toBe('challenged');
  });
  it('updates only the selected case when checking and unchecking it', () => {
    const component = Object.create(UnLinkCasesComponent.prototype);
    component.linkedCases = [{ caseReference: '123', unlink: false }, { caseReference: '456', unlink: true }];
    component.linkedCasesService = { casesToUnlink: ['456'] };
    component.errorMessages = [];
    component.onChange({ value: '123', checked: true });
    expect(component.linkedCases[0].unlink).toBeTrue();
    expect(component.linkedCasesService.casesToUnlink).toEqual(['456', '123']);
    component.onChange({ value: '123', checked: false });
    expect(component.linkedCases[0].unlink).toBeFalse();
    expect(component.linkedCases[1].unlink).toBeTrue();
    expect(component.linkedCasesService.casesToUnlink).toEqual(['456']);
    component.onChange({ value: 'missing', checked: true });
    expect(component.linkedCasesService.casesToUnlink).toEqual(['456']);
  });
  it('reports a lookup failure without changing the linked cases', () => {
    const component = Object.create(UnLinkCasesComponent.prototype);
    component.linkedCases = [{ caseReference: '123' }];
    component.casesService = { getCaseViewV2: () => throwError(() => new Error('lookup failed')) };
    component.linkedCasesService = { casesToUnlink: [], linkedCases: component.linkedCases };
    component.notifyAPIFailure = new EventEmitter<boolean>();
    const emitted: boolean[] = [];
    component.notifyAPIFailure.subscribe((value: boolean) => emitted.push(value));
    component.getAllLinkedCaseInformation();
    expect(component.isServerError).toBeTrue();
    expect(emitted).toEqual([true]);
    expect(component.linkedCases).toEqual([{ caseReference: '123' }]);
  });

});
