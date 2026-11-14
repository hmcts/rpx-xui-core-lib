import { of } from 'rxjs';
import { LinkedCasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/services/linked-cases.service';

export const registered = true;

describe('LinkedCasesService migration contract', () => {
  it('uses the last case name found and retains the missing-name fallback', () => {
    const service = new LinkedCasesService({ getJurisdictions: () => of([]) } as unknown as ConstructorParameters<typeof LinkedCasesService>[0], {} as unknown as ConstructorParameters<typeof LinkedCasesService>[1]);
    const view = { tabs: [{ fields: [{ id: 'caseNameHmctsInternal', value: 'First' }] }, { fields: [{ id: 'caseNameHmctsInternal', value: 'Last' }] }] } as unknown as Parameters<typeof service.getCaseName>[0];
    expect(service.getCaseName(view)).toBe('Last');
    expect(service.getCaseName({ tabs: [] } as unknown as typeof view)).toBe('Case name missing');
  });
  it('groups case references and resets journey state', () => {
    const service = new LinkedCasesService({ getJurisdictions: () => of([]) } as unknown as ConstructorParameters<typeof LinkedCasesService>[0], {} as unknown as ConstructorParameters<typeof LinkedCasesService>[1]);
    service.caseFieldValue = [
      { id: '1', value: { CaseType: 'A', CaseReference: '123' } },
      { id: '2', value: { CaseType: 'A', CaseReference: '456' } },
      { id: '3', value: { CaseType: 'B', CaseReference: '789' } }
    ];
    expect(service.groupLinkedCasesByCaseType(service.caseFieldValue, 'CaseType')).toEqual({ A: ['123', '456'], B: ['789'] });
    service.casesToUnlink = ['123'];
    service.cachedFieldValues = service.caseFieldValue;
    service.resetLinkedCaseData();
    expect(service.caseFieldValue).toEqual([]);
    expect(service.casesToUnlink).toEqual([]);
    expect(service.cachedFieldValues).toBeNull();
  });
});
