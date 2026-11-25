import '@angular/compiler';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { createRichTextHost, readRichTextValue } from './rich-text-host';
import { createDatetimeToggleHost, refreshDatetimeToggleHost } from './datetime-toggle-host';
import { createDialog } from './collection-dialog-host';
import { createCaseFlagHost, readCaseFlagSelection, readCaseFlagState } from './case-flags-host';

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
  createCaseFlagHost: async () => { await createCaseFlagHost(); return true; },
  readCaseFlagSelection,
  readCaseFlagState
});
