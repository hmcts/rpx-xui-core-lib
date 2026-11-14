import { FormGroup } from '@angular/forms';
import { WriteDocumentFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/document/write-document-field.component';

export const registered = true;

describe('Document upload migration contract', () => {
  it('rejects disallowed file types before attempting an upload', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.formGroup = new FormGroup({});
    component.documentManagement = { uploadFile: jasmine.createSpy('uploadFile') };
    component.uploadedDocument = new FormGroup({});
    component.updateDocumentForm = jasmine.createSpy('updateDocumentForm');
    component.fileChangeEvent({ target: { files: [new File(['x'], 'bad.exe')] } }, '\\.pdf$');
    expect(component.documentManagement.uploadFile).not.toHaveBeenCalled();
    expect(component.formGroup.hasError('invalidFileFormat')).toBeTrue();
    expect(component.fileUploadMessages).toBe(WriteDocumentFieldComponent.UPLOAD_ERROR_INVALID_FORMAT);
  });
  it('updates secure document references and clears the upload state', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.fileSecureModeOn = true;
    component.uploadedDocument = new FormGroup({});
    component.caseField = { value: {} };
    component.documentManagement = { isDocumentSecureModeEnabled: () => true };
    component.generateLogMessage = jasmine.createSpy('generateLogMessage');
    component.updateDocumentForm = jasmine.createSpy('updateDocumentForm');
    component.fileUploadStateService = { setUploadInProgress: jasmine.createSpy('setUploadInProgress') };
    const document = { originalDocumentName: 'file.pdf', hashToken: 'hash', _links: { self: { href: '/document' }, binary: { href: '/binary' } } };
    component.handleDocumentUploadResult({ documents: [document] });
    expect(component.updateDocumentForm).toHaveBeenCalledWith('/document', '/binary', 'file.pdf', 'hash');
    expect(component.caseField.value).toEqual({ document_url: '/document', document_binary_url: '/binary', document_filename: 'file.pdf', document_hash: 'hash' });
    expect(component.fileUploadStateService.setUploadInProgress).toHaveBeenCalledWith(false);
    expect(component.valid).toBeTrue();
  });

  it('reports an unavailable upload service and clears the upload state', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.fileUploadStateService = { setUploadInProgress: jasmine.createSpy('setUploadInProgress') };
    component.handleDocumentUploadError({ status: 502 });
    expect(component.fileUploadMessages).toBe(WriteDocumentFieldComponent.UPLOAD_ERROR_NOT_AVAILABLE);
    expect(component.valid).toBeFalse();
    expect(component.fileUploadStateService.setUploadInProgress).toHaveBeenCalledWith(false);
  });

  it('cancels an in-flight upload and resets the file input', () => {
    const component = Object.create(WriteDocumentFieldComponent.prototype);
    component.fileUploadSubscription = { unsubscribe: jasmine.createSpy('unsubscribe') };
    component.fileUploadStateService = { setUploadInProgress: jasmine.createSpy('setUploadInProgress') };
    component.fileInput = { nativeElement: { value: 'selected.pdf' } };
    component.caseField = { display_context: 'OPTIONAL' };
    component.selectedFile = new File(['x'], 'selected.pdf');
    component.cancelUpload();
    expect(component.fileUploadSubscription.unsubscribe).toHaveBeenCalled();
    expect(component.fileUploadStateService.setUploadInProgress).toHaveBeenCalledWith(false);
    expect(component.fileInput.nativeElement.value).toBe('');
    expect(component.selectedFile).toBeNull();
  });

});
