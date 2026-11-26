import { CommonModule } from '@angular/common';
import { Component, Input, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { WriteDocumentFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/document/write-document-field.component';
import { FileUploadStateService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/document/file-upload-state.service';
import { CaseNotifier } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/case.notifier';
import { DocumentManagementService } from '../../projects/core-lib/case/editor-source/lib/shared/services/document-management/document-management.service';
import { JurisdictionService } from '../../projects/core-lib/case/editor-source/lib/shared/services/jurisdiction/jurisdiction.service';
import { SessionStorageService } from '../../projects/core-lib/case/editor-source/lib/shared/services/session';

@Pipe({ name: 'ccdFieldLabel', standalone: false })
class FieldLabelStub implements PipeTransform {
  transform(field: { label?: string }): string { return field.label ?? ''; }
}

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform {
  transform(value: string): string { return value; }
}

@Component({ selector: 'ccd-read-document-field', template: '', standalone: false })
class ReadDocumentStub {
  @Input() public caseField: unknown;
}

let fixture: ReturnType<typeof TestBed.createComponent<WriteDocumentFieldComponent>>;
let uploadCount = 0;
let uploadInProgress = false;
let uploadPayload: FormData | null = null;

export async function createDocumentUploadHost() {
  TestBed.resetTestingModule();
  uploadCount = 0;
  uploadInProgress = false;
  uploadPayload = null;

  const documentManagement = {
    parseCaseInfo: () => ({ caseType: 'civil', jurisdiction: 'family', caseId: 'CASE-123' }),
    isDocumentSecureModeEnabled: () => false,
    uploadFile: (data: FormData) => {
      uploadCount += 1;
      uploadPayload = data;
      return of({ _embedded: { documents: [{
        originalDocumentName: 'notice.pdf',
        _links: { self: { href: '/documents/1' }, binary: { href: '/documents/1/binary' } }
      }] } });
    }
  };
  const uploadState = {
    isUploadInProgress: () => uploadInProgress,
    setUploadInProgress: (value: boolean) => { uploadInProgress = value; }
  };

  await TestBed.configureTestingModule({
    imports: [CommonModule],
    declarations: [WriteDocumentFieldComponent, FieldLabelStub, TranslateStub, ReadDocumentStub],
    providers: [
      { provide: AbstractAppConfig, useValue: { logMessage: (): void => undefined } },
      { provide: CaseNotifier, useValue: {} },
      { provide: DocumentManagementService, useValue: documentManagement },
      { provide: MatDialog, useValue: {} },
      { provide: FileUploadStateService, useValue: uploadState },
      { provide: JurisdictionService, useValue: {} },
      { provide: SessionStorageService, useValue: { getItem: (): string | null => null } }
    ]
  }).compileComponents();

  fixture = TestBed.createComponent(WriteDocumentFieldComponent);
  fixture.componentInstance.caseField = {
    id: 'supportingDocument',
    label: 'Supporting document',
    display_context: 'MANDATORY',
    value: {},
    field_type: { regular_expression: '\\.pdf$' }
  } as unknown as typeof fixture.componentInstance.caseField;
  fixture.componentInstance.formGroup = new FormGroup({});
  document.body.appendChild(fixture.nativeElement);
  fixture.autoDetectChanges();
}

export function readDocumentUploadState() {
  const file = uploadPayload?.get('files');
  const document = fixture.componentInstance.formGroup.get('supportingDocument');
  return {
    uploadCount,
    uploadInProgress,
    formErrors: fixture.componentInstance.formGroup.errors,
    documentValue: document?.value,
    caseFieldValue: fixture.componentInstance.caseField.value,
    uploadPayload: uploadPayload ? {
      fileName: file instanceof File ? file.name : null,
      classification: uploadPayload.get('classification'),
      caseTypeId: uploadPayload.get('caseTypeId'),
      jurisdictionId: uploadPayload.get('jurisdictionId')
    } : null
  };
}
