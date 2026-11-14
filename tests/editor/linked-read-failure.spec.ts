import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ReadLinkedCasesFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/read-linked-cases-field.component';
import { LinkedCasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/services/linked-cases.service';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { CommonDataService } from '../../projects/core-lib/case/editor-source/lib/shared/services/common-data-service/common-data-service';

export const registered = true;

describe('Linked cases display migration contract', () => {
  it('renders unique retry links for failures in both directions', async () => {
    const navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    const linkedCases = { caseJurisdictionID: 'jurisdiction', caseDetails: { case_type: 'type', case_id: '123' } };
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [ReadLinkedCasesFieldComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        { provide: Router, useValue: { navigate } },
        { provide: LinkedCasesService, useValue: linkedCases },
        { provide: AbstractAppConfig, useValue: { getRDCommonDataApiUrl: () => '/refdata' } },
        { provide: CommonDataService, useValue: { getRefData: () => of({ list_of_values: [] }) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const fixture = TestBed.createComponent(ReadLinkedCasesFieldComponent);
    spyOn(fixture.componentInstance, 'ngAfterViewInit');
    fixture.detectChanges();
    fixture.componentInstance.getFailureLinkedToNotification(true);
    fixture.componentInstance.getFailureLinkedFromNotification(true);
    for (const multipleFailures of [false, true]) {
      fixture.componentInstance.isServerJurisdictionError = multipleFailures;
      fixture.componentInstance.isServerReasonCodeError = multipleFailures;
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.govuk-link'));
      expect(links.length).toBe(2);
      const ids = Array.from(root.querySelectorAll('[id]'), element => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      links.forEach(link => {
        expect(link.textContent.replace(/\s+/g, ' ').trim()).toBe('Reload the Linked cases tab');
        link.click();
      });
      expect(navigate).toHaveBeenCalledWith(['cases', 'case-details', 'jurisdiction', 'type', '123'], { fragment: 'Linked cases' });
    }
    expect(navigate).toHaveBeenCalledTimes(4);
    fixture.destroy();
  });
  it('keeps incoming and outgoing lookup failures separate', () => {
    const component = new ReadLinkedCasesFieldComponent({} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[0], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[1], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[2], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[3], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[4]);
    component.getFailureLinkedToNotification(true);
    expect(component.isServerLinkedToError).toBeTrue();
    expect(component.isServerLinkedFromError).toBeFalse();
    component.getFailureLinkedFromNotification(true);
    expect(component.isServerLinkedFromError).toBeTrue();
  });
});
