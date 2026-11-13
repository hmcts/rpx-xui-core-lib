import type { NextFunction, Request, Response } from 'express'
import express from 'express'
import * as http from 'node:http'
import helmet from 'helmet'
import { csp, getContentSecurityPolicy, type CspOptions } from './csp'
import { SECURITY_POLICY } from '../../constants/securityPolicy'

const originalEnvironment = { ...process.env }

beforeEach(() => {
    for (const name of ['SCRIPT_EXTRA', 'STYLE_EXTRA', 'CONNECT_EXTRA', 'FONT_EXTRA', 'IMG_EXTRA', 'REPORT_ONLY']) delete process.env[`CSP_${name}`]
})
afterEach(() => { process.env = { ...originalEnvironment } })

function capture(options?: CspOptions) {
    const next = jest.fn()
    const request = {} as Request
    const response = { locals: {}, setHeader: jest.fn() } as unknown as Response
    const spy = jest.spyOn(helmet, 'contentSecurityPolicy').mockImplementation(() => (_req, res, next) => {
        res.setHeader('Content-Security-Policy', 'mocked-csp-header')
        next()
    })
    csp(options)(request, response, next)
    return { next, response, options: spy.mock.calls.at(-1)?.[0] }
}

async function serve(options: CspOptions = {}) {
    const app = express()
    app.use(csp(options))
    app.get('/', (_req, res) => res.json({ nonce: res.locals.cspNonce }))
    const server = http.createServer(app)
    await new Promise<void>((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing fixture address')
    return {
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
    }
}

describe('csp middleware', () => {
    test('should set a nonce on res.locals', () => {
        const result = capture()
        expect(Buffer.from(result.response.locals.cspNonce, 'base64')).toHaveLength(16)
        expect(result.next).toHaveBeenCalledTimes(1)
    })

    test('should call helmet.contentSecurityPolicy with correct directives', () => {
        const { options, response } = capture()
        expect(options?.directives?.scriptSrc).toEqual(["'self'", `'nonce-${response.locals.cspNonce}'`])
        expect(options?.directives?.styleSrc).toEqual(["'self'", `'nonce-${response.locals.cspNonce}'`])
    })

    test('should add extra directives from options', () => {
        const { options } = capture({ extraScript: ['https://script.test'], extraStyle: ['https://style.test'],
            extraConnect: ['https://connect.test'], extraFont: ['https://font.test'], extraImg: ['https://image.test'] })
        for (const [name, value] of Object.entries({ scriptSrc: 'https://script.test', styleSrc: 'https://style.test',
            connectSrc: 'https://connect.test', fontSrc: 'https://font.test', imgSrc: 'https://image.test' })) {
            expect(options?.directives?.[name]).toContain(value)
        }
    })

    test('should set Content-Security-Policy header', () => {
        const { response, next } = capture()
        expect(response.setHeader).toHaveBeenCalledWith('Content-Security-Policy', 'mocked-csp-header')
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('honours CSP_REPORT_ONLY env flag', () => {
        process.env.CSP_REPORT_ONLY = 'true'
        expect(capture().options?.reportOnly).toBe(true)
    })

    test('merges extras from environment variables', () => {
        process.env.CSP_SCRIPT_EXTRA = 'https://env-script.test'
        expect(capture().options?.directives?.scriptSrc).toContain('https://env-script.test')
    })

    test('captures environment extras at construction and explicit empty arrays override them', () => {
        for (const name of ['SCRIPT', 'STYLE', 'CONNECT', 'FONT', 'IMG']) process.env[`CSP_${name}_EXTRA`] = 'https://first.test,, https://kept-space.test'
        const middleware = csp()
        for (const name of ['SCRIPT', 'STYLE', 'CONNECT', 'FONT', 'IMG']) process.env[`CSP_${name}_EXTRA`] = 'https://second.test'
        const result = capture({ extraScript: [], extraStyle: [], extraConnect: [], extraFont: [], extraImg: [] })
        for (const name of ['scriptSrc', 'styleSrc', 'connectSrc', 'fontSrc', 'imgSrc']) {
            expect(result.options?.directives?.[name]).not.toContain('https://second.test')
            expect(result.options?.directives?.[name]).not.toContain('https://first.test')
        }
        middleware({} as Request, result.response, result.next)
        const options = jest.mocked(helmet.contentSecurityPolicy).mock.calls.at(-1)?.[0]
        for (const name of ['scriptSrc', 'styleSrc', 'connectSrc', 'fontSrc', 'imgSrc']) {
            expect(options?.directives?.[name]).toContain('https://first.test')
            expect(options?.directives?.[name]).toContain(' https://kept-space.test')
            expect(options?.directives?.[name]).not.toContain('')
            expect(options?.directives?.[name]).not.toContain('https://second.test')
        }
    })

    test('retains caller-owned explicit arrays so later edits affect subsequent requests', () => {
        const scripts = ['https://initial.test']
        const middleware = csp({ extraScript: scripts })
        const result = capture()
        scripts.push('https://later.test')
        middleware({} as Request, result.response, result.next)
        expect(jest.mocked(helmet.contentSecurityPolicy).mock.calls.at(-1)?.[0]?.directives?.scriptSrc).toEqual(
            expect.arrayContaining(['https://initial.test', 'https://later.test']),
        )
    })

    test('generated flags win and report-only is evaluated for each request', () => {
        const result = capture({ defaultCsp: { useDefaults: false, reportOnly: true } })
        expect(result.options?.useDefaults).toBe(true)
        const middleware = csp({ defaultCsp: { reportOnly: false } })
        process.env.CSP_REPORT_ONLY = 'true'
        middleware({} as Request, result.response, result.next)
        expect(jest.mocked(helmet.contentSecurityPolicy).mock.calls.at(-1)?.[0]?.reportOnly).toBe(true)
        process.env.CSP_REPORT_ONLY = 'TRUE'
        middleware({} as Request, result.response, result.next)
        expect(jest.mocked(helmet.contentSecurityPolicy).mock.calls.at(-1)?.[0]?.reportOnly).toBe(false)
    })

    test('concatenates default arrays before generated values without deduplicating or mutation', () => {
        const scripts = Object.freeze(["'self'", 'https://base.test'])
        const defaults = Object.freeze({ directives: Object.freeze({ scriptSrc: scripts, mediaSrc: ['https://media.test'] }) })
        const { options, response } = capture({ defaultCsp: defaults, extraScript: ['https://base.test'] })
        expect(options?.directives?.scriptSrc).toEqual(["'self'", 'https://base.test', "'self'", `'nonce-${response.locals.cspNonce}'`, 'https://base.test'])
        expect(options?.directives?.mediaSrc).toEqual(['https://media.test'])
        expect(defaults.directives.scriptSrc).toEqual(["'self'", 'https://base.test'])
        expect(options?.directives).not.toBe(defaults.directives)
    })

    test('preserves callbacks and custom iterable directives while generated arrays replace non-arrays', () => {
        const callback = jest.fn(() => 'https://callback.test')
        const iterable = new Set(['https://frame.test'])
        const { options } = capture({ defaultCsp: { directives: { reportUri: [callback], childSrc: iterable, scriptSrc: null } } })
        expect(options?.directives?.reportUri).toEqual([callback])
        expect(options?.directives?.childSrc).toBe(iterable)
        expect(options?.directives?.scriptSrc).toEqual(expect.arrayContaining(["'self'", expect.stringMatching(/^'nonce-/)]))
        expect(callback).not.toHaveBeenCalled()
    })

    test('does not merge inherited directive arrays into generated nonce sources', () => {
        const directives = Object.create({ scriptSrc: ['https://inherited.test'] })
        const { options } = capture({ defaultCsp: { directives } })
        expect(options?.directives?.scriptSrc).not.toContain('https://inherited.test')
        expect(options?.directives?.scriptSrc).toEqual(expect.arrayContaining(["'self'", expect.stringMatching(/^'nonce-/)]))
    })

    test('snapshots own root and directive getters once per request and ignores inherited root directives', () => {
        let rootReads = 0
        let directiveReads = 0
        const policy = { get directives() {
            rootReads += 1
            return { get scriptSrc() { directiveReads += 1; return ['https://own.test'] } }
        } }
        const { options } = capture({ defaultCsp: policy })
        expect(rootReads).toBe(1)
        expect(directiveReads).toBe(1)
        expect(options?.directives?.scriptSrc).toContain('https://own.test')
        const inherited = Object.create({ directives: { scriptSrc: ['https://inherited-root.test'] } })
        const result = capture({ defaultCsp: inherited })
        expect(result.options?.directives?.scriptSrc).not.toContain('https://inherited-root.test')
        expect(result.options?.directives?.scriptSrc).toEqual(expect.arrayContaining(["'self'", expect.stringMatching(/^'nonce-/)]))
    })

    test('getContentSecurityPolicy passes the existing policy object and returns the provider result', () => {
        const handler = jest.fn()
        const provider = { contentSecurityPolicy: jest.fn(() => handler) }
        expect(getContentSecurityPolicy(provider)).toBe(handler)
        expect(provider.contentSecurityPolicy).toHaveBeenCalledWith(SECURITY_POLICY)
        expect(provider.contentSecurityPolicy.mock.calls).toHaveLength(1)
    })
})

describe('CSP HTTP integration', () => {
    test('produces real headers containing fresh per-request 16-byte nonces', async () => {
        const host = await serve()
        try {
            const responses = await Promise.all([fetch(host.url, { signal: AbortSignal.timeout(2000) }), fetch(host.url, { signal: AbortSignal.timeout(2000) })])
            const nonces: string[] = []
            for (const response of responses) {
                expect(response.status).toBe(200)
                const body = await response.json() as { nonce: string }
                expect(Buffer.from(body.nonce, 'base64')).toHaveLength(16)
                nonces.push(body.nonce)
                const header = response.headers.get('content-security-policy')
                expect(header).toContain(`script-src 'self' 'nonce-${body.nonce}'`)
                expect(header).toContain(`style-src 'self' 'nonce-${body.nonce}'`)
                expect(header).toContain("style-src-attr 'unsafe-inline'")
                expect(header).toContain("form-action 'none'")
                expect(response.headers.get('content-security-policy-report-only')).toBeNull()
            }
            expect(nonces[0]).not.toBe(nonces[1])
        } finally { await host.close() }
    })

    test('retains legacy policy sources, callback values and custom disabled directives', async () => {
        const host = await serve({ defaultCsp: { ...SECURITY_POLICY, directives: { ...SECURITY_POLICY.directives,
            reportUri: [() => '/synthetic-report'], upgradeInsecureRequests: null } }, extraScript: ['https://extra.test'] })
        try {
            const response = await fetch(host.url, { signal: AbortSignal.timeout(2000) })
            expect(response.status).toBe(200)
            const header = response.headers.get('content-security-policy')
            expect(header).toContain('https://*.google-analytics.com')
            expect(header).toContain('https://extra.test')
            expect(header).toContain('media-src')
            expect(header).toContain('report-uri /synthetic-report')
            expect(header).not.toContain('upgrade-insecure-requests')
        } finally { await host.close() }
    })

    test('preserves constructor and prototype directive names while Helmet rejects an own reserved key', async () => {
        const host = await serve({ defaultCsp: { directives: {
            constructor: ['https://constructor.test'], prototype: ['https://prototype.test'], childSrc: new Set(['https://child.test']),
        } } })
        try {
            const response = await fetch(host.url, { signal: AbortSignal.timeout(2000) })
            expect(response.status).toBe(200)
            const header = response.headers.get('content-security-policy')
            expect(header).toContain('constructor https://constructor.test')
            expect(header).toContain('prototype https://prototype.test')
            expect(header).toContain('child-src https://child.test')
        } finally { await host.close() }
        const middleware = csp({ defaultCsp: { directives: JSON.parse('{"__proto__":["https://invalid.test"]}') } })
        expect(() => middleware({} as Request, { locals: {} } as Response, jest.fn())).toThrow(/invalid directive name/)
    })

    test('uses only the report-only header when the exact flag is true', async () => {
        process.env.CSP_REPORT_ONLY = 'true'
        const host = await serve()
        try {
            const response = await fetch(host.url, { signal: AbortSignal.timeout(2000) })
            const body = await response.json() as { nonce: string }
            expect(response.status).toBe(200)
            expect(response.headers.get('content-security-policy')).toBeNull()
            expect(response.headers.get('content-security-policy-report-only')).toContain(`'nonce-${body.nonce}'`)
        } finally { await host.close() }
    })

    test('forwards malformed directive failures through Express without serving protected content', async () => {
        const app = express()
        const protectedRoute = jest.fn((_req: Request, res: Response) => res.send('unexpected'))
        const errors = jest.fn((error: Error, _req: Request, res: Response, _next: NextFunction) => {
            void _next
            expect(error.message).toMatch(/duplicate directive/)
            res.status(503).send('configuration rejected')
        })
        app.use(csp({ defaultCsp: { directives: { 'script-src': ["'self'"] } } }))
        app.get('/', protectedRoute)
        app.use(errors)
        const server = http.createServer(app)
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
        try {
            const address = server.address() as import('node:net').AddressInfo
            const response = await fetch(`http://127.0.0.1:${address.port}`, { signal: AbortSignal.timeout(2000) })
            expect(response.status).toBe(503)
            expect(await response.text()).toBe('configuration rejected')
            expect(errors).toHaveBeenCalledTimes(1)
            expect(protectedRoute).not.toHaveBeenCalled()
        } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
    })
})
