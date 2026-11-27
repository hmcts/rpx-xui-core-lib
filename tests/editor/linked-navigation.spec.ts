import { describe, expect, it, vi } from 'vitest';
import { WriteLinkedCasesFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/write-linked-cases-field.component';
import { BeforeYouStartComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/before-you-start/before-you-start.component';

export const registered = true;

describe('Linked cases navigation migration contract', () => {
  it('forwards validation errors without advancing the journey', () => {
    const component = Object.create(WriteLinkedCasesFieldComponent.prototype);
    component.caseEditDataService = { clearFormValidationErrors: vi.fn(), addFormValidationError: vi.fn() };
    component.proceedToNextPage = vi.fn();
    component.onLinkedCasesStateEmitted({ navigateToNextPage: false, errorMessages: [{ fieldId: 'case', description: 'Invalid reference' }] });
    expect(component.caseEditDataService.clearFormValidationErrors).toHaveBeenCalled();
    expect(component.caseEditDataService.addFormValidationError).toHaveBeenCalledWith({ id: 'case', message: 'Invalid reference' });
    expect(component.proceedToNextPage).not.toHaveBeenCalled();
  });

  it('returns to the linked-cases tab using the case type identifier', () => {
    const router = { navigate: vi.fn() };
    const component = Object.create(BeforeYouStartComponent.prototype);
    component.router = router;
    component.linkedCasesService = {
      caseDetails: { case_type: { id: 'type', jurisdiction: { id: 'jurisdiction' } } },
      caseId: '123'
    };
    component.onBack();
    expect(router.navigate).toHaveBeenCalledWith(['cases', 'case-details', 'jurisdiction', 'type', '123'], { fragment: 'Linked cases' });
  });
});
