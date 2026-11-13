import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import crypto from 'node:crypto'
import { SECURITY_POLICY } from '../../constants/securityPolicy'

type PolicyOptions = NonNullable<Parameters<typeof helmet.contentSecurityPolicy>[0]>

export interface CspOptions {
    extraScript?: string[]
    extraStyle?: string[]
    extraConnect?: string[]
    extraFont?: string[]
    extraImg?: string[]
    // Preserve the legacy broad non-nullish option; Helmet validates its recognized fields.
    defaultCsp?: NonNullable<unknown>
}

export function csp({
    extraScript = (process.env.CSP_SCRIPT_EXTRA ?? '').split(',').filter(Boolean),
    extraStyle = (process.env.CSP_STYLE_EXTRA ?? '').split(',').filter(Boolean),
    extraConnect = (process.env.CSP_CONNECT_EXTRA ?? '').split(',').filter(Boolean),
    extraFont = (process.env.CSP_FONT_EXTRA ?? '').split(',').filter(Boolean),
    extraImg = (process.env.CSP_IMG_EXTRA ?? '').split(',').filter(Boolean),
    defaultCsp = {},
}: CspOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const nonce = crypto.randomBytes(16).toString('base64')
        res.locals.cspNonce = nonce
        const generated = {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", `'nonce-${nonce}'`, ...extraScript],
            styleSrc: ["'self'", `'nonce-${nonce}'`, ...extraStyle],
            styleSrcAttr: ["'unsafe-inline'"],
            connectSrc: ["'self'", 'blob:', 'data:', ...extraConnect],
            imgSrc: ["'self'", 'data:', ...extraImg],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', ...extraFont],
            objectSrc: ["'none'"],
            frameSrc: ["'self'"],
            frameAncestors: ["'self'"],
            formAction: ["'none'"],
        }
        const policy = { ...(defaultCsp as PolicyOptions) }
        const baseDirectives = { ...policy.directives }
        const directives = { ...baseDirectives, ...Object.fromEntries(Object.entries(generated).map(([name, values]) => {
            const previous = Object.hasOwn(baseDirectives, name) ? baseDirectives[name] : undefined
            // Preserve source array order and duplicates; read only own policy directives.
            return [name, Array.isArray(previous) ? [...previous, ...values] : values]
        })) }
        helmet.contentSecurityPolicy({
            ...policy,
            useDefaults: true,
            directives,
            reportOnly: process.env.CSP_REPORT_ONLY === 'true',
        })(req, res, next)
    }
}

export const getContentSecurityPolicy = <T>(provider: {
    contentSecurityPolicy: (policy: typeof SECURITY_POLICY) => T,
}): T => provider.contentSecurityPolicy(SECURITY_POLICY)
