import express, { NextFunction, Request, Response, Router } from 'express'
import type { Server } from 'node:http'
import passport from 'passport'
import { OpenID } from '../oidc/models/openid.class'
import { OAuth2 } from '../oauth2/models/oauth2.class'
import { XuiLogger } from '../../common/util/debug.logger'

type LoginHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>
type PassportOutcome = 'error' | 'no-user'

const logger = (): XuiLogger => ({
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
})

const expectLoginFailureToComplete = async (
    strategyName: string,
    loginHandler: LoginHandler,
    outcome: PassportOutcome,
): Promise<void> => {
    let forwardedError: Error | undefined
    const authStrategy: passport.Strategy = {
        name: strategyName,
        authenticate(this: passport.StrategyCreated<passport.Strategy>): void {
            if (outcome === 'error') {
                this.error(new Error('provider returned private-token at https://idam.test/private'))
            } else {
                this.fail('provider returned private-token at https://idam.test/private', 503)
            }
        },
    }
    passport.use(strategyName, authStrategy)

    const app = express()
    app.use(passport.initialize())
    app.get('/health', (_req, res) => res.status(200).end('ok'))
    app.get('/auth/login', (req, res, next) => {
        void loginHandler(req, res, next)
    })
    app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
        forwardedError = error
        void next
        res.status(503).json({ message: 'Authentication request failed' })
    })

    const server: Server = await new Promise((resolve, reject) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer))
        listeningServer.once('error', reject)
    })

    try {
        const address = server.address()
        if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP port')
        const origin = `http://127.0.0.1:${address.port}`
        const response = await fetch(`${origin}/auth/login`, { signal: AbortSignal.timeout(1000) })

        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({ message: 'Authentication request failed' })
        expect(forwardedError).toBeInstanceOf(Error)
        expect(forwardedError?.message).toBe(
            outcome === 'error'
                ? 'Authentication service error'
                : 'No user details returned by the authentication service',
        )
        expect(forwardedError?.message).not.toContain('private-token')
        expect(forwardedError?.message).not.toContain('idam.test')
        await expect(fetch(`${origin}/health`, { signal: AbortSignal.timeout(1000) })).resolves.toMatchObject({
            status: 200,
        })
    } finally {
        passport.unuse(strategyName)
        await new Promise<void>((resolve, reject) => {
            server.close(error => (error ? reject(error) : resolve()))
        })
    }
}

const handlers: Array<{ label: string; name: string; create: () => LoginHandler }> = [
    {
        label: 'OAuth2',
        name: 'oauth2',
        create: () => new OAuth2(Router({ mergeParams: true }), logger()).loginHandler,
    },
    {
        label: 'OIDC',
        name: 'oidc',
        create: () => new OpenID(Router({ mergeParams: true }), logger()).loginHandler,
    },
]

for (const handler of handlers) {
    for (const outcome of ['error', 'no-user'] as const) {
        test(`${handler.label} loginHandler completes Passport ${outcome} results`, async () => {
            await expectLoginFailureToComplete(handler.name, handler.create(), outcome)
        })
    }
}
