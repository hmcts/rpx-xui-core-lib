import '@angular/compiler';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { createRichTextHost, readRichTextSetValueId, readRichTextValue, setRichTextValue } from './rich-text-host';
import { createDatetimeToggleHost, refreshDatetimeToggleHost } from './datetime-toggle-host';
import { createDialog } from './collection-dialog-host';
import { createCaseFlagHost, readCaseFlagSelection, readCaseFlagState } from './case-flags-host';
import { createCaseViewerFullAccessHost, createCaseViewerHost, createCaseViewerNotifierHost, emitCaseViewerDetails, readCaseViewerRequestUrl } from './case-viewer-host';
import { createDocumentUploadHost, readDocumentUploadState, resolveDocumentUpload } from './document-upload-host';
import { createLinkedCasesBackHost, createLinkedCasesHost, readLinkedCasesBackNavigation, readLinkedCasesState, reloadLinkedCases } from './linked-cases-host';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessHostTestingModule {}

getTestBed().initTestEnvironment([BrowserTestingModule, ZonelessHostTestingModule], platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
  teardown: { destroyAfterEach: true }
});

Object.assign(globalThis, {
  createRichTextHost: async (preexistingControl?: boolean, initialValue?: string, reuseParentFormGroup?: boolean) => { await createRichTextHost(preexistingControl, initialValue, reuseParentFormGroup); return true; },
  readRichTextValue,
  readRichTextSetValueId,
  setRichTextValue,
  createDatetimeToggleHost: async () => { await createDatetimeToggleHost(); return true; },
  refreshDatetimeToggleHost,
  createDialogCloseHost: async (index: number) => { await createDialog(index); return true; },
  createCaseFlagHost: async (persistedStatus?: string) => { await createCaseFlagHost(persistedStatus); return true; },
  readCaseFlagSelection,
  readCaseFlagState,
  createCaseViewerHost,
  createCaseViewerFullAccessHost,
  createCaseViewerNotifierHost,
  emitCaseViewerDetails,
  readCaseViewerRequestUrl,
  createDocumentUploadHost,
  readDocumentUploadState,
  resolveDocumentUpload,
  createLinkedCasesHost,
  readLinkedCasesState,
  reloadLinkedCases,
  createLinkedCasesBackHost,
  readLinkedCasesBackNavigation
});
