import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

@Component({
  selector: 'core-test-host',
  imports: [ReactiveFormsModule],
  templateUrl: './validation.html',
  styleUrl: './validation.css',
})
class ValidationGallery {
  readonly form = new FormGroup({
    first: new FormControl(false, { nonNullable: true }),
    second: new FormControl(false, { nonNullable: true }),
  }, checkboxesBeCheckedValidator());
  submitted = false;
}

const galleries: Array<{ matches: (path: string) => boolean; start: () => Promise<unknown> }> = [
  { matches: path => path === '/service-messages', start: () => import('./service-messages').then(({ startServiceMessagesGallery }) => startServiceMessagesGallery()) },
  { matches: path => path === '/invitation', start: () => import('./invitation').then(({ startInvitationGallery }) => startInvitationGallery()) },
  { matches: path => path === '/user-list', start: () => import('./user-list').then(({ startUserListGallery }) => startUserListGallery()) },
  { matches: path => path === '/user-details', start: () => import('./user-details').then(({ startUserDetailsGallery }) => startUserDetailsGallery()) },
  { matches: path => path === '/case-list', start: () => import('./case-list').then(({ startCaseListGallery }) => startCaseListGallery()) },
  { matches: path => path === '/pagination', start: () => import('./pagination').then(({ startPaginationGallery }) => startPaginationGallery()) },
  { matches: path => path === '/address', start: () => import('./address').then(({ startAddressGallery }) => startAddressGallery()) },
  { matches: path => path === '/task-lookups', start: () => import('./task-lookups').then(({ startTaskLookupsGallery }) => startTaskLookupsGallery()) },
  { matches: path => path === '/selected-cases', start: () => import('./selected-cases').then(({ startSelectedCasesGallery }) => startSelectedCasesGallery()) },
  { matches: path => path === '/share-case', start: () => import('./share-case').then(({ startShareCaseGallery }) => startShareCaseGallery()) },
  { matches: path => path === '/reuse-person', start: () => import('./reuse-person').then(({ startReusePersonHost }) => startReusePersonHost()) },
  { matches: path => path === '/find-person', start: () => import('./find-person').then(({ startFindPersonGallery }) => startFindPersonGallery()) },
  { matches: path => path === '/checkbox-list', start: () => import('./checkbox-list').then(({ startCheckboxListGallery }) => startCheckboxListGallery()) },
  { matches: path => path === '/gov-date', start: () => import('./gov-date').then(({ startGovDateGallery }) => startGovDateGallery()) },
  { matches: path => path === '/gov-input', start: () => import('./gov-input').then(({ startGovInputGallery }) => startGovInputGallery()) },
  { matches: path => path === '/terms-display', start: () => import('./terms-display').then(({ startTermsDisplayGallery }) => startTermsDisplayGallery()) },
  { matches: path => path === '/search-location', start: () => import('./search-location').then(({ startSearchLocationGallery }) => startSearchLocationGallery()) },
  { matches: path => path === '/hearing-lookups', start: () => import('./hearing-lookups').then(({ startHearingLookupsGallery }) => startHearingLookupsGallery()) },
  { matches: path => path === '/session-error', start: () => import('./session-error').then(({ startSessionErrorGallery }) => startSessionErrorGallery()) },
  { matches: path => path === '/editor-date', start: () => import('./editor-date').then(({ startEditorDateGallery }) => startEditorDateGallery()) },
  { matches: path => path === '/window', start: () => import('./window').then(({ startWindowGallery }) => startWindowGallery()) },
  { matches: path => path.startsWith('/session-storage'), start: () => import('./session-storage').then(({ startSessionStorageGallery }) => startSessionStorageGallery()) },
  { matches: path => path.startsWith('/cookie'), start: () => import('./cookie').then(({ startCookieGallery }) => startCookieGallery()) },
  { matches: path => path === '/feature-toggle', start: () => import('./feature-toggle').then(({ startFeatureToggleGallery }) => startFeatureToggleGallery()) },
  { matches: path => path === '/primitives', start: () => import('./primitives').then(({ startPrimitivesGallery }) => startPrimitivesGallery()) },
  { matches: path => path === '/session-dialog', start: () => import('./session-dialog').then(({ startSessionDialogGallery }) => startSessionDialogGallery()) },
  { matches: path => path === '/accessibility', start: () => import('./accessibility').then(({ startAccessibilityGallery }) => startAccessibilityGallery()) },
  { matches: path => path === '/due-date', start: () => import('./due-date').then(({ startDueDateGallery }) => startDueDateGallery()) },
  { matches: path => path === '/case-reference', start: () => import('./case-reference').then(({ startCaseReferenceGallery }) => startCaseReferenceGallery()) },
  { matches: path => path === '/contact', start: () => import('./contact').then(({ startContactGallery }) => startContactGallery()) },
  { matches: path => path === '/spinner', start: () => import('./spinner').then(({ startSpinnerGallery }) => startSpinnerGallery()) },
  { matches: path => path === '/translation', start: () => import('./translation').then(({ startTranslationGallery }) => startTranslationGallery()) },
];

const gallery = galleries.find(({ matches }) => matches(window.location.pathname));
const application = gallery ? gallery.start() : bootstrapApplication(ValidationGallery);
application.catch((error: unknown) => console.error(error));
