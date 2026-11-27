import { createFlagSubmission } from './flag-submission-host';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { MediaViewerModule } from '@hmcts/media-viewer';
import { RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { PaletteModule } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/palette.module';
import { WriteCaseFlagFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-flag/write-case-flag-field.component';
import { CaseFlagStateService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case-flag-state.service';
import { CaseEditDataService } from '../../projects/core-lib/case/editor-source/lib/shared/commons/case-edit-data/case-edit-data.service';
import { LinkedCasesService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/services';
import { CaseFlagRefdataService } from '../../projects/core-lib/case/editor-source/lib/shared/services/case-flag/case-flag-refdata.service';
import { CaseField } from '@hmcts/rpx-xui-core-lib/case/notifier';

export async function createFlagWriterFixture() {
  TestBed.resetTestingModule();
  const launcher = Object.assign(new CaseField(), { id: 'FlagLauncher', value: null,
    field_type: { id: 'FlagLauncher', type: 'FlagLauncher' } });
  const flags = Object.assign(new CaseField(), { id: 'partyFlags',
    field_type: { id: 'Flags', type: 'Complex', complex_fields: [] },
    value: { partyName: 'Fictional party', details: [{ id: 'existing', value: { name: 'Existing concern', status: 'Active' } }] },
    formatted_value: { partyName: 'Fictional party', details: [{ id: 'existing', value: { name: 'Existing concern', status: 'Active' } }] }
  });
  const state = new CaseFlagStateService();
  const refdata = new Subject<unknown>();
  let requestedReview = false;
  // Document viewing is an external boundary; this flag-only host must not start viewer effects or sockets.
  TestBed.overrideModule(MediaViewerModule, { set: { imports: [], declarations: [], exports: [], providers: [] } });
  await TestBed.configureTestingModule({
    imports: [StoreModule.forRoot({}), EffectsModule.forRoot([]), PaletteModule],
    providers: [provideHttpClient(), provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { params: { eid: 'createFlag', page: 'flags' }, data: {
        case: { case_type: { id: 'TestCase', jurisdiction: { id: 'TEST' } } },
        eventTrigger: { supplementary_data: { HMCTSServiceId: 'TEST' }, case_fields: [flags, launcher] }
      } } } },
      { provide: CaseFlagRefdataService, useValue: { getCaseFlagsRefdata: () => refdata } },
      { provide: CaseFlagStateService, useValue: state },
      { provide: CaseEditDataService, useValue: { clearFormValidationErrors: (): void => undefined, caseTitle$: of('Synthetic flag case'), setTriggerSubmitEvent: (value: boolean): void => { requestedReview = value; } } },
      { provide: LinkedCasesService, useValue: { resetLinkedCaseData: (): void => undefined } },
      { provide: RpxTranslationService, useValue: { language: 'en', language$: of('en'), getTranslation$: (value: string) => of(value) } }
    ]
  }).compileComponents();
  const fixture = TestBed.createComponent(WriteCaseFlagFieldComponent);
  fixture.componentInstance.caseField = launcher;
  fixture.componentInstance.formGroup = new FormGroup({});
  fixture.detectChanges();
  state.initialCaseFlags = { data: { partyFlags: structuredClone(flags.value) } };
  return { fixture, flags, state, refdata, reviewRequested: () => requestedReview };
}

export async function mountFlagWriterHost() {
  const host = await createFlagWriterFixture();
  const container = document.createElement('section');
  container.id = 'flag-writer-journey';
  container.appendChild(host.fixture.nativeElement);
  const next = document.createElement('button');
  next.textContent = 'Continue flag journey';
  const output = document.createElement('pre');
  output.id = 'flag-writer-evidence';
  let submission: ReturnType<typeof createFlagSubmission> | undefined;
  const submit = document.createElement('button');
  submit.textContent = 'Submit flag';
  const fail = document.createElement('button');
  fail.textContent = 'Return callback failure';
  const succeed = document.createElement('button');
  succeed.textContent = 'Return callback success';
  let suppliedRefdata = false;
  const renderEvidence = () => {
    output.textContent = JSON.stringify({ details: host.flags.value.details,
      formattedDetails: host.flags.formatted_value.details,
      submission: submission?.evidence(), reviewRequested: host.reviewRequested(), valid: host.fixture.componentInstance.formGroup.valid });
  };
  next.addEventListener('click', () => {
    host.fixture.componentInstance.next();
    host.fixture.detectChanges();
    if (!suppliedRefdata && host.refdata.observed) {
      suppliedRefdata = true;
      host.refdata.next([{ name: 'Root', childFlags: [{ name: 'New concern', flagCode: 'NEW', isParent: false,
        flagComment: true, Path: ['Root', 'New concern'] }] }]);
      host.fixture.detectChanges();
    }
    renderEvidence();
  });
  submit.addEventListener('click', () => { submission ??= createFlagSubmission(host); submission.submit(); renderEvidence(); });
  fail.addEventListener('click', () => { submission?.fail(); renderEvidence(); });
  succeed.addEventListener('click', () => { submission?.succeed(); renderEvidence(); });
  container.append(next, submit, fail, succeed, output);
  document.body.appendChild(container);
  renderEvidence();
  return true;
}
