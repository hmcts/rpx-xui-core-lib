import { describe, expect, it, vi } from 'vitest';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { WriteDocumentFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/document/write-document-field.component';
import { FileUploadStateService } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/document/file-upload-state.service';

export const registered = true;

type UploadResponse = {
  _embedded: {
    documents: Array<{
      originalDocumentName: string;
      _links: { self: { href: string }; binary: { href: string } };
    }>;
  };
};

describe('Document upload migration contract', () => {
  it('keeps upload state active until every document field finishes', () => {
    const service = new FileUploadStateService();
    const firstField = {};
    const secondField = {};
    // Keep this call shape runnable against Toolkit's original one-argument service.
    const setUploadInProgress = service.setUploadInProgress.bind(service) as (value: boolean, owner: object) => void;

    setUploadInProgress(true, firstField);
    setUploadInProgress(true, secondField);
    setUploadInProgress(false, firstField);

    expect(service.isUploadInProgress()).toBe(true);
    setUploadInProgress(false, secondField);
    expect(service.isUploadInProgress()).toBe(false);
  });

  it('clears active field uploads when navigation is explicitly allowed', () => {
    const service = new FileUploadStateService();
    service.beginUpload({});
    service.beginUpload({});

    service.setUploadInProgress(false);

    expect(service.isUploadInProgress()).toBe(false);
  });

  it('rejects disallowed file types before attempting an upload', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.formGroup = new FormGroup({});
    component.documentManagement = { uploadFile: vi.fn() };
    component.uploadedDocument = new FormGroup({});
    component.updateDocumentForm = vi.fn();
    component.fileUploadStateService = createUploadStateMock();
    component.fileChangeEvent({ target: { files: [new File(['x'], 'bad.exe')] } }, '\\.pdf$');
    expect(component.documentManagement.uploadFile).not.toHaveBeenCalled();
    expect(component.formGroup.hasError('invalidFileFormat')).toBe(true);
    expect(component.fileUploadMessages).toBe(WriteDocumentFieldComponent.UPLOAD_ERROR_INVALID_FORMAT);
  });
  it('updates secure document references and clears the upload state', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.fileSecureModeOn = true;
    component.uploadedDocument = new FormGroup({});
    component.caseField = { value: {} };
    component.documentManagement = { isDocumentSecureModeEnabled: () => true };
    component.generateLogMessage = vi.fn();
    component.updateDocumentForm = vi.fn();
    component.fileUploadStateService = createUploadStateMock();
    const document = { originalDocumentName: 'file.pdf', hashToken: 'hash', _links: { self: { href: '/document' }, binary: { href: '/binary' } } };
    component.handleDocumentUploadResult({ documents: [document] });
    expect(component.updateDocumentForm).toHaveBeenCalledWith('/document', '/binary', 'file.pdf', 'hash');
    expect(component.caseField.value).toEqual({ document_url: '/document', document_binary_url: '/binary', document_filename: 'file.pdf', document_hash: 'hash' });
    expect(component.fileUploadStateService.endUpload).toHaveBeenCalled();
    expect(component.valid).toBe(true);
  });

  it('reports an unavailable upload service and clears the upload state', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.fileUploadStateService = createUploadStateMock();
    component.handleDocumentUploadError({ status: 502 });
    expect(component.fileUploadMessages).toBe(WriteDocumentFieldComponent.UPLOAD_ERROR_NOT_AVAILABLE);
    expect(component.valid).toBe(false);
    expect(component.fileUploadStateService.endUpload).toHaveBeenCalled();
  });

  it('cancels an in-flight upload and resets the file input', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    const uploadSubscription = { unsubscribe: vi.fn() };
    component.fileUploadSubscription = uploadSubscription;
    component.fileUploadStateService = createUploadStateMock();
    component.fileInput = { nativeElement: { value: 'selected.pdf' } };
    component.caseField = { display_context: 'OPTIONAL' };
    component.selectedFile = new File(['x'], 'selected.pdf');
    component.cancelUpload();
    expect(uploadSubscription.unsubscribe).toHaveBeenCalled();
    expect(component.fileUploadSubscription).toBeUndefined();
    expect(component.fileUploadStateService.endUpload).toHaveBeenCalled();
    expect(component.fileInput.nativeElement.value).toBe('');
    expect(component.selectedFile).toBeNull();
  });

  it('keeps the latest accepted upload when an earlier request completes afterwards', () => {
    const firstUpload = new Subject<UploadResponse>();
    const replacementUpload = new Subject<UploadResponse>();
    let uploadInProgress = false;
    const updateDocumentForm = vi.fn();
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.fileSecureModeOn = false;
    component.uploadedDocument = {};
    component.caseField = { value: {} };
    component.generateLogMessage = vi.fn();
    component.updateDocumentForm = updateDocumentForm;
    component.fileUploadStateService = {
      beginUpload: () => { uploadInProgress = true; },
      endUpload: () => { uploadInProgress = false; },
      setUploadInProgress: (value: boolean) => { uploadInProgress = value; },
      isUploadInProgress: () => uploadInProgress
    };
    component.documentManagement = {
      isDocumentSecureModeEnabled: () => false,
      uploadFile: vi.fn((formData: FormData) => {
        const file = formData.get('files') as File;
        return file.name === 'first.pdf' ? firstUpload : replacementUpload;
      })
    };

    component.fileChangeEvent({ target: { files: [new File(['first'], 'first.pdf')] } }, '\\.pdf$');
    component.fileChangeEvent({ target: { files: [new File(['replacement'], 'replacement.pdf')] } }, '\\.pdf$');
    expect(firstUpload.observed).toBe(false);
    expect(replacementUpload.observed).toBe(true);
    replacementUpload.next({ _embedded: { documents: [uploadedDocument('/replacement', 'replacement.pdf')] } });
    firstUpload.next({ _embedded: { documents: [uploadedDocument('/first', 'first.pdf')] } });

    expect(updateDocumentForm).toHaveBeenLastCalledWith('/replacement', '/replacement/binary', 'replacement.pdf');
    expect(component.caseField.value.document_url).toBe('/replacement');
    expect(component.caseField.value.document_filename).toBe('replacement.pdf');
    expect(uploadInProgress).toBe(false);
  });

  it('ignores an earlier accepted upload after the replacement file is rejected', () => {
    const firstUpload = new Subject<UploadResponse>();
    let uploadInProgress = false;
    const updateDocumentForm = vi.fn();
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.fileSecureModeOn = false;
    component.uploadedDocument = {};
    component.caseField = { value: {} };
    component.formGroup = new FormGroup({});
    component.generateLogMessage = vi.fn();
    component.updateDocumentForm = updateDocumentForm;
    component.fileUploadStateService = {
      beginUpload: () => { uploadInProgress = true; },
      endUpload: () => { uploadInProgress = false; },
      setUploadInProgress: (value: boolean) => { uploadInProgress = value; },
      isUploadInProgress: () => uploadInProgress
    };
    component.documentManagement = {
      isDocumentSecureModeEnabled: () => false,
      uploadFile: vi.fn(() => firstUpload)
    };

    component.fileChangeEvent({ target: { files: [new File(['first'], 'first.pdf')] } }, '\\.pdf$');
    component.fileChangeEvent({ target: { files: [new File(['rejected'], 'rejected.exe')] } }, '\\.pdf$');
    firstUpload.next({ _embedded: { documents: [uploadedDocument('/first', 'first.pdf')] } });

    expect(updateDocumentForm).toHaveBeenLastCalledWith(null, null, null);
    expect(component.caseField.value.document_url).toBeUndefined();
    expect(uploadInProgress).toBe(false);
    expect(component.formGroup.hasError('invalidFileFormat')).toBe(true);
  });

});

function createUploadStateMock() {
  return {
    beginUpload: vi.fn(),
    endUpload: vi.fn(),
    setUploadInProgress: vi.fn(),
    isUploadInProgress: vi.fn(() => false)
  };
}

function uploadedDocument(url: string, fileName: string): UploadResponse['_embedded']['documents'][number] {
  return {
    originalDocumentName: fileName,
    _links: { self: { href: url }, binary: { href: `${url}/binary` } }
  };
}
