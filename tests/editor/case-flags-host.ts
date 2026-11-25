import { CommonModule } from '@angular/common';
import { Component, Pipe, PipeTransform } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ManageCaseFlagsComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/components/manage-case-flags/manage-case-flags.component';
import { CaseFlagDisplayContextParameter } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/enums/case-flag-display-context-parameter.enum';
import { CaseFlagState, FlagDetailDisplayWithFormGroupPath, FlagsWithFormGroupPath } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/domain';

@Pipe({ name: 'manageCaseFlagsLabelDisplay', standalone: false })
class ManageCaseFlagsLabelStub implements PipeTransform {
  transform(value: FlagDetailDisplayWithFormGroupPath): string {
    return `${value.flagDetailDisplay.partyName} - ${value.flagDetailDisplay.flagDetail.name}`;
  }
}

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform {
  transform(value: string): string { return value; }
}

let fixture: ReturnType<typeof TestBed.createComponent<CaseFlagsHostComponent>>;

function createFlagsData(persistedStatus?: string): FlagsWithFormGroupPath[] {
  return [{
    pathToFlagsFormGroup: 'party.flags',
    flags: {
      partyName: 'Fictional party',
      details: [{ id: 'new-flag', flagCode: 'NEW', name: 'New safety concern', status: 'Requested' }]
    },
    caseField: {
      id: 'party',
      formatted_value: persistedStatus
        ? { flags: { details: [{ id: 'new-flag', value: { status: persistedStatus } }] } }
        : { details: [] }
    }
  } as unknown as FlagsWithFormGroupPath];
}

@Component({
  selector: 'test-case-flags-host',
  template: `<ccd-manage-case-flags #flags [formGroup]="formGroup" [flagsData]="flagsData"
    [displayContextParameter]="displayContextParameter" (caseFlagStateEmitter)="emittedState = $event">
  </ccd-manage-case-flags><button type="button" (click)="flags.onNext()">Continue</button>`,
  standalone: false
})
class CaseFlagsHostComponent {
  public readonly formGroup = new FormGroup({});
  public readonly displayContextParameter = CaseFlagDisplayContextParameter.UPDATE;
  public flagsData = createFlagsData();
  public emittedState?: CaseFlagState;
}

export async function createCaseFlagHost(persistedStatus?: string) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule],
    declarations: [CaseFlagsHostComponent, ManageCaseFlagsComponent, ManageCaseFlagsLabelStub, TranslateStub]
  }).compileComponents();

  fixture = TestBed.createComponent(CaseFlagsHostComponent);
  fixture.componentInstance.flagsData = createFlagsData(persistedStatus);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
}

export function readCaseFlagSelection() {
  const selection = fixture.componentInstance.formGroup.get('selectedManageCaseLocation')?.value as FlagDetailDisplayWithFormGroupPath | null;
  return selection ? {
    id: selection.flagDetailDisplay.flagDetail.id,
    originalStatus: selection.originalStatus ?? null
  } : null;
}

export function readCaseFlagState() {
  const state = fixture.componentInstance.emittedState;
  return state ? {
    selectedFlagId: state.selectedFlag?.flagDetailDisplay.flagDetail.id ?? null,
    originalStatus: state.selectedFlag?.originalStatus ?? null,
    errorMessages: state.errorMessages.map((error) => error.description)
  } : null;
}
