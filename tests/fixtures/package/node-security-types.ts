import { csp, getContentSecurityPolicy, SECURITY_POLICY, type CspOptions } from '@hmcts/rpx-xui-core-lib/node/server/security';
import { getLogger, type XuiLogger } from '@hmcts/rpx-xui-core-lib/node/server';
import helmet from 'helmet';
import type { RequestHandler } from 'express';
import { MC_CSP } from './node-csp-config/mc';
import { MO_CSP } from './node-csp-config/mo';
import { AO_CSP } from './node-csp-config/ao';
export const policies = { MC_CSP, MO_CSP, AO_CSP };
export const handlers: RequestHandler[] = Object.values(policies).map(options => csp({ defaultCsp: SECURITY_POLICY, ...options }));
export const staticHandler: RequestHandler = getContentSecurityPolicy(helmet);
export const logger: XuiLogger = getLogger('consumer:security');
// The source's broad defaultCsp declaration remains compatible; Helmet validates runtime fields.
export const customOptions: CspOptions = { defaultCsp: { customApplicationMetadata: true } };

const mutableOptions: NonNullable<Parameters<typeof csp>[0]> = { extraScript: [] };
mutableOptions.extraScript?.push('https://mutable-option.test');
