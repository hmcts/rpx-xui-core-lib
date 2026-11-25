import { describe, expect, it, vi } from 'vitest';
import { WriteLinkedCasesFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/write-linked-cases-field.component';

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
});
