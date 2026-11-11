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
void [matches, singleMatch, keyPresent, sortedRoles];
const credentials: RouteCredential = { userName: 'user', password: 'password', routes: ['/'], scope: 'scope' };
const auth: AuthOptions = { authorizationURL: 'a', tokenURL: 't', clientID: 'id', clientSecret: 'secret', callbackURL: 'c', scope: 'scope', discoveryEndpoint: 'd', issuerURL: 'i', responseTypes: ['code'], tokenEndpointAuthMethod: 'client_secret_basic', routeCredential: credentials };
const session: SessionMetadata = { cookie: { httpOnly: true, secure: true }, name: 'session', resave: false, saveUninitialized: false, secret: 'secret' };
const fileSession: FileSessionMetadata = { ...session, fileStoreOptions: { filePath: '/tmp/example' } };
const redisSession: RedisSessionMetadata = { ...session, redisStoreOptions: { redisKeyPrefix: 'xui', redisCloudUrl: 'redis://localhost', redisTtl: 3600 } };
// @ts-expect-error The published contract requires a client secret.
const invalidAuth: AuthOptions = { authorizationURL: 'a', tokenURL: 't', clientID: 'id', callbackURL: 'c', scope: 'scope', discoveryEndpoint: 'd', issuerURL: 'i', responseTypes: ['code'], tokenEndpointAuthMethod: 'client_secret_basic' };
// @ts-expect-error Redis sessions require store options.
const invalidRedis: RedisSessionMetadata = session;
void [auth, fileSession, redisSession, invalidAuth, invalidRedis];

import { RpxTranslationConfig, RpxTranslationService, RpxTranslationModule, RpxTranslatePipe, type RpxLanguage, type Replacements } from '@hmcts/rpx-xui-core-lib/i18n';
import { RpxTranslationService as LegacyTranslationService } from 'rpx-xui-translation';
const translationConstructor: typeof RpxTranslationService = LegacyTranslationService;
const language: RpxLanguage = 'cy';
const replacements: Replacements = { name: 'Example' };
const configuration = new RpxTranslationConfig();
void [translationConstructor, language, replacements, configuration, RpxTranslationModule, RpxTranslatePipe];

export const timeout: RoleGroupSessionTimeout = getUserSessionTimeout(['role'], [{ pattern: 'role', idleModalDisplayTime: 2, totalIdleTime: 10 }]);
