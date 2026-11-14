import { NoLinkedCasesComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/no-linked-cases/no-linked-cases.component';

export const registered = true;

describe('No linked cases migration contract', () => {
  it('returns to the linked cases tab with the existing case identifiers', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const linkedCases = { caseJurisdictionID: 'jurisdiction', caseDetails: { case_type: 'type' }, caseId: '123' };
    const component = new NoLinkedCasesComponent(router as unknown as ConstructorParameters<typeof NoLinkedCasesComponent>[0], linkedCases as unknown as ConstructorParameters<typeof NoLinkedCasesComponent>[1], { addTojourneyCollection() {} } as unknown as ConstructorParameters<typeof NoLinkedCasesComponent>[2]);
    component.onBack();
    expect(router.navigate).toHaveBeenCalledWith(['cases', 'case-details', 'jurisdiction', 'type', '123'], { fragment: 'Linked cases' });
  });
});
