import '@angular/compiler';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { createRichTextHost, readRichTextValue } from './rich-text-host';
import { createDatetimeToggleHost, refreshDatetimeToggleHost } from './datetime-toggle-host';
import { createDialog } from './collection-dialog-host';
import { createCaseFlagHost, readCaseFlagSelection, readCaseFlagState } from './case-flags-host';
import { createCaseViewerFullAccessHost, createCaseViewerHost, createCaseViewerNotifierHost, emitCaseViewerDetails, readCaseViewerRequestUrl } from './case-viewer-host';
import { createDocumentUploadHost, readDocumentUploadState } from './document-upload-host';
import { createLinkedCasesHost, readLinkedCasesState, reloadLinkedCases } from './linked-cases-host';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessHostTestingModule {}

getTestBed().initTestEnvironment([BrowserTestingModule, ZonelessHostTestingModule], platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
  teardown: { destroyAfterEach: true }
});

Object.assign(globalThis, {
  createRichTextHost: async () => { await createRichTextHost(); return true; },
  readRichTextValue,
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
  createLinkedCasesHost,
  readLinkedCasesState,
  reloadLinkedCases
});
