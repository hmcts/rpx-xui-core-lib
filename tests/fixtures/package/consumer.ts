// The structural APF root must resolve without exposing runtime capabilities.
export type RootDeclarations = typeof import('@hmcts/rpx-xui-core-lib');
import { FormControl, FormGroup, type ValidatorFn } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

const validator: ValidatorFn = checkboxesBeCheckedValidator(2);
const form: FormGroup = new FormGroup({ first: new FormControl(true) }, validator);
void form.errors;

import { arrayPatternMatch, isStringPatternMatch, getUserSessionTimeout, hasKey, sortArray, type RoleGroupSessionTimeout, type AuthOptions, type RouteCredential, type SessionMetadata, type FileSessionMetadata, type RedisSessionMetadata } from '@hmcts/rpx-xui-core-lib/node';
const matches: boolean = arrayPatternMatch(['pui-user-manager'], 'user-manager');
const singleMatch: boolean = isStringPatternMatch('pui-user-manager', '^pui-');
const keyPresent: boolean = hasKey({ role: 'manager' }, 'role');
const sortedRoles: string[] = sortArray(['b', 'a']);
const credentials: RouteCredential = { userName: 'user', password: 'password', routes: ['/'], scope: 'scope' };
export const auth: AuthOptions = { authorizationURL: 'a', tokenURL: 't', clientID: 'id', clientSecret: 'secret', callbackURL: 'c', scope: 'scope', discoveryEndpoint: 'd', issuerURL: 'i', responseTypes: ['code'], tokenEndpointAuthMethod: 'client_secret_basic', routeCredential: credentials };
const session: SessionMetadata = { cookie: { httpOnly: true, secure: true }, name: 'session', resave: false, saveUninitialized: false, secret: 'secret' };
export const fileSession: FileSessionMetadata = { ...session, fileStoreOptions: { filePath: 'example/session' } };
export const redisSession: RedisSessionMetadata = { ...session, redisStoreOptions: { redisKeyPrefix: 'xui', redisCloudUrl: 'redis://localhost', redisTtl: 3600 } };
// @ts-expect-error The published contract requires a client secret.
export const invalidAuth: AuthOptions = { authorizationURL: 'a', tokenURL: 't', clientID: 'id', callbackURL: 'c', scope: 'scope', discoveryEndpoint: 'd', issuerURL: 'i', responseTypes: ['code'], tokenEndpointAuthMethod: 'client_secret_basic' };
// @ts-expect-error Redis sessions require store options.
export const invalidRedis: RedisSessionMetadata = session;

import { RpxTranslationConfig, RpxTranslationService, RpxTranslationModule, RpxTranslatePipe, type RpxLanguage, type Replacements } from '@hmcts/rpx-xui-core-lib/i18n';
import { RpxTranslationService as LegacyTranslationService } from 'rpx-xui-translation';
const translationConstructor: typeof RpxTranslationService = LegacyTranslationService;
const language: RpxLanguage = 'cy';
const replacements: Replacements = { name: 'Example' };
const configuration = new RpxTranslationConfig();

export const timeout: RoleGroupSessionTimeout = getUserSessionTimeout(['role'], [{ pattern: 'role', idleModalDisplayTime: 2, totalIdleTime: 10 }]);

import { LoadingSpinnerComponent, LoadingSpinnerModule } from '@hmcts/rpx-xui-core-lib/ui/loading-spinner';

import { BadgeColour, ContactDetailsComponent, ContactDetailsModule, type ContactDetailsDataModel } from '@hmcts/rpx-xui-core-lib/ui/contact-details';
const contact: ContactDetailsDataModel = { badgeColour: BadgeColour.BADGE_BLUE };

import { CaseReferencePipe, CaseReferenceModule } from '@hmcts/rpx-xui-core-lib/case/reference';
const caseReference = new CaseReferencePipe().transform('1234567890123456');

import { Draft, CaseDetails, DRAFT_PREFIX, DRAFT_QUERY_PARAM } from '@hmcts/rpx-xui-core-lib/case/models';
const draft = new Draft();
const details = new CaseDetails();

// Named exports keep every imported capability in this compile-only consumer.
export {
  matches, singleMatch, keyPresent, sortedRoles,
  translationConstructor, language, replacements, configuration, RpxTranslationModule, RpxTranslatePipe,
  LoadingSpinnerComponent, LoadingSpinnerModule,
  contact, ContactDetailsComponent, ContactDetailsModule,
  caseReference, CaseReferenceModule,
  draft, details, DRAFT_PREFIX, DRAFT_QUERY_PARAM,
};

import { SharedCaseErrorMessages, type SharedCase, type UserDetails, type UserAccessType } from '@hmcts/rpx-xui-core-lib/case/sharing';
const access: UserAccessType = { jurisdictionId: 'j', organisationProfileId: 'p', accessTypeId: 'a', enabled: true };
const sharedUser: UserDetails = { email: 'test@example.test', firstName: 'First', lastName: 'Last', idamId: 'id', userAccessTypes: [access] };
export const sharedCase: SharedCase = { caseId: 'case', caseTitle: 'Title', pendingShares: [sharedUser] };
export const sharingError: SharedCaseErrorMessages = SharedCaseErrorMessages.OneCaseMustBeSelected;
// @ts-expect-error caseId remains required in the legacy contract.
export const invalidSharedCase: SharedCase = { caseTitle: 'Title' };
import { http } from '@hmcts/rpx-xui-core-lib/node/http';
export const get = http.get;

import type {} from '@hmcts/rpx-xui-core-lib/node/server';
type PublishedRequest = import('express-serve-static-core').Request;
export const refreshRequest: PublishedRequest['isRefresh'] = true;
type PublishedSession = import('express-session').Session;
export const passportSession: PublishedSession['passport'] = { user: 'consumer-defined' };

import { DueDateComponent, DueDateModule, DateBadgeColour, SECONDS_IN_A_DAY } from '@hmcts/rpx-xui-core-lib/ui/due-date';
export { DueDateComponent, DueDateModule, DateBadgeColour, SECONDS_IN_A_DAY };

import { AccessibilityComponent, AccessibilityModule } from '@hmcts/rpx-xui-core-lib/ui/accessibility';
export { AccessibilityComponent, AccessibilityModule };

import { HmctsSessionDialogComponent, SessionDialogModule } from '@hmcts/rpx-xui-core-lib/ui/session-dialog';
export { HmctsSessionDialogComponent, SessionDialogModule };

type IsAny<T> = 0 extends (1 & T) ? true : false;
type SessionCloseValue = Parameters<HmctsSessionDialogComponent['close']['emit']>[0];
export const legacySessionCloseType: IsAny<SessionCloseValue> = true;

import { HmctsBannerComponent, BannerModule } from '@hmcts/rpx-xui-core-lib/ui/banner';
import { GovUkLabelComponent, FormLabelModule } from '@hmcts/rpx-xui-core-lib/ui/form-label';
export { HmctsBannerComponent, BannerModule, GovUkLabelComponent, FormLabelModule };

import { LoadingService, HasLoadingState } from '@hmcts/rpx-xui-core-lib/ui/loading-state';
class DefaultLoadingState extends HasLoadingState {}
export const defaultLoadingState: HasLoadingState = new DefaultLoadingState();
export const loadingService: HasLoadingState = new LoadingService();
export const loadingRegistration: string = loadingService instanceof LoadingService ? loadingService.register() : '';

import { FindPersonModule, FindPersonComponent, FindAPersonService, type SearchOptions, PersonRole } from '@hmcts/rpx-xui-core-lib/ui/find-person';
export { FindPersonModule, FindPersonComponent, FindAPersonService };
export const personSearch: SearchOptions = { searchTerm: 'test', userRole: PersonRole.ADMIN, services: ['test'] };
export * from './node-security-types';
