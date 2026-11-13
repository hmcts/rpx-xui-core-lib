import { Router } from 'express'
import { Request, Response } from 'express'
import passport from 'passport'
import { XuiLogger } from '../../common/util/debug.logger'
import { http } from '../../common/http'
import { Strategy } from './strategy.class'
import { AUTH } from '../../../constants/auth'

class TestStrategy extends Strategy {
    constructor(logger: XuiLogger) {
        super('test', Router({ mergeParams: true }), logger)
    }
}

const getMockLogger = (): XuiLogger => {
    return {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}

test('initialiseStrategy does not log option values', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    const options = {
        clientID: 'client-id',
        clientSecret: 'very-secret',
        discoveryEndpoint: 'https://idam.test/.well-known?access_token=synthetic-query-token',
        routeCredential: {
            userName: 'user@xui',
            password: 'super-secret-password',
        },
    }

    await strategy.initialiseStrategy(options)

    expect(logger.log).toHaveBeenCalledTimes(1)
    const diagnostic = JSON.stringify((logger.log as jest.Mock).mock.calls)
    for (const sensitiveValue of ['very-secret', 'super-secret-password', 'synthetic-query-token', 'user@xui']) {
        expect(diagnostic).not.toContain(sensitiveValue)
    }
})

test('callback logs do not include OAuth callback query parameters', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    const response = { locals: {}, redirect: jest.fn() } as unknown as Response

    await strategy.callbackHandler({
        url: '/oauth/callback?code=synthetic-code&state=synthetic-state',
        path: '/oauth/callback',
        query: {},
    } as unknown as Request, response, jest.fn())

    const diagnostic = JSON.stringify((logger.log as jest.Mock).mock.calls)
    expect(diagnostic).not.toContain('synthetic-code')
    expect(diagnostic).not.toContain('synthetic-state')
})

test('valid callbacks do not log authorization state values', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    ;(strategy as unknown as { options: { sessionKey: string } }).options = { sessionKey: 'auth' }
    const authError = Object.assign(new Error('Request failed'), {
        config: { headers: { Authorization: 'Basic synthetic-basic' }, data: 'client_secret=synthetic-client-secret' },
    })
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation((_name, _options, callback) => {
        callback?.(authError, false, { message: 'No user details returned' })
        return jest.fn()
    })
    const response = { locals: {}, redirect: jest.fn() } as unknown as Response

    await strategy.callbackHandler({
        url: '/oauth/callback?code=synthetic-code&state=synthetic-state',
        path: '/oauth/callback',
        query: { state: 'synthetic-state' },
        session: { auth: { state: 'synthetic-state' } },
    } as unknown as Request, response, jest.fn())

    const diagnostic = JSON.stringify([...(logger.log as jest.Mock).mock.calls, ...(logger.error as jest.Mock).mock.calls])
    expect(authenticate).toHaveBeenCalled()
    expect(diagnostic).not.toContain('synthetic-state')
    expect(diagnostic).not.toContain('synthetic-basic')
    expect(diagnostic).not.toContain('synthetic-client-secret')
    authenticate.mockRestore()
})

test.each([
    ['provider error', new Error('provider returned synthetic-secret at https://idam.test/private'), 'Authentication service error'],
    [
        'timeout',
        Object.assign(new Error('request timed out at https://idam.test/private'), {
            name: 'TimeoutError',
            gotOptions: { gotTimeout: { request: 15000 } },
        }),
        'Timeout awaiting authentication service for 15000ms',
    ],
])('authentication failure event uses a safe %s message', async (_label, authError, expectedMessage) => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    const response = { locals: {}, redirect: jest.fn() } as unknown as Response
    let emittedMessage: string | undefined
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation((_name, _options, callback) => {
        callback?.(authError, false, { message: 'provider failure' })
        return jest.fn()
    })
    strategy.on(AUTH.EVENT.AUTHENTICATE_FAILURE, (_req, res) => {
        emittedMessage = res.locals.message
    })

    await strategy.callbackHandler({
        url: '/oauth/callback?state=synthetic-state',
        path: '/oauth/callback',
        query: { state: 'synthetic-state' },
        session: {},
    } as unknown as Request, response, jest.fn())

    expect(emittedMessage).toBe(`${expectedMessage}\nNo user details returned by the authentication service, redirecting to login`)
    const diagnostic = JSON.stringify([...(logger.log as jest.Mock).mock.calls, ...(logger.error as jest.Mock).mock.calls])
    expect(diagnostic).not.toContain(authError.message)
    expect(diagnostic).not.toContain('https://idam.test/private')
    authenticate.mockRestore()
})

test('token request failures do not log authorization or password grant credentials', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    await strategy.initialiseStrategy({
        logoutURL: 'https://idam.test',
        clientID: 'synthetic-client',
        clientSecret: 'synthetic-client-secret',
        routeCredential: { userName: 'synthetic-user', password: 'synthetic-password', scope: 'scope', routes: ['/'] },
    })
    const error = Object.assign(new Error('Request failed'), {
        config: { headers: { Authorization: 'Basic synthetic-basic' }, data: 'client_secret=synthetic-client-secret' },
    })
    const post = jest.spyOn(http, 'post').mockRejectedValue(error)

    await strategy.generateToken()

    const diagnostic = JSON.stringify((logger.error as jest.Mock).mock.calls)
    for (const secret of ['synthetic-basic', 'synthetic-client-secret', 'synthetic-password']) {
        expect(diagnostic).not.toContain(secret)
    }
    post.mockRestore()
})

test('getSSOLogoutUrl should include required end session parameters using the id token', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    await strategy.initialiseStrategy({
        ssoLogoutURL: 'http://idam.test/o/endSession',
    })

    const ssoLogoutUrl = strategy.getSSOLogoutUrl('http://service.test', 'id-token-value') as string
    const parsedUrl = new URL(ssoLogoutUrl)

    expect(`${parsedUrl.origin}${parsedUrl.pathname}`).toEqual('http://idam.test/o/endSession')
    expect(parsedUrl.searchParams.get('post_logout_redirect_uri')).toEqual('http://service.test')
    expect(parsedUrl.searchParams.get('id_token_hint')).toEqual('id-token-value')
    expect(parsedUrl.searchParams.get('id_token_hint')).not.toEqual('access-token-value')
})

test('getSSOLogoutUrl should not build an end session URL without an id token', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    await strategy.initialiseStrategy({
        ssoLogoutURL: 'http://idam.test/o/endSession',
    })

    expect(strategy.getSSOLogoutUrl('http://service.test')).toBeUndefined()
})

test('logout redirects with the ID token without writing it to logs', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    const idToken = 'synthetic-logout-id-token'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the test needs only the runtime logout options.
    ;(strategy as any).options = {
        clientID: 'client-id',
        clientSecret: 'client-secret',
        logoutURL: 'https://idam.test/logout',
        ssoLogoutURL: 'https://idam.test/end-session',
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the mocked Axios response is irrelevant to the redirect contract.
    const deleteRequest = jest.spyOn(http, 'delete').mockResolvedValue({} as any)
    const request = {
        session: {
            passport: { user: { tokenset: { accessToken: 'access-token', refreshToken: 'refresh-token', idToken } } },
            destroy: (callback: (error?: Error) => void) => callback(),
        },
        logout: (_options: unknown, callback: (error?: Error) => void) => callback(),
        protocol: 'https',
        get: () => 'service.test',
        query: {},
    } as unknown as Request
    const response = { redirect: jest.fn() } as unknown as Response

    await strategy.logout(request, response, jest.fn())
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(response.redirect).toHaveBeenCalledWith(expect.stringContaining(`id_token_hint=${idToken}`))
    expect(JSON.stringify((logger.log as jest.Mock).mock.calls)).not.toContain(idToken)
    deleteRequest.mockRestore()
})

test('logout and access-denied callbacks log safe error names instead of raw errors', async () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    const error = new Error('synthetic-error-with-sensitive-response')
    const next = jest.fn()
    const request = {
        session: {
            passport: { user: { tokenset: { accessToken: 'access-token', refreshToken: 'refresh-token', idToken: 'id-token' } } },
        },
        logout: (_options: unknown, callback: (error?: Error) => void) => callback(error),
    } as unknown as Request
    const response = {} as Response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the mocked Axios response is irrelevant to these callback paths.
    const deleteRequest = jest.spyOn(http, 'delete').mockResolvedValue({} as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the test needs only the runtime logout options.
    ;(strategy as any).options = { clientID: 'client-id', clientSecret: 'client-secret', logoutURL: 'https://idam.test/logout' }
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    await strategy.logout(request, response, next)
    await strategy.accessDenied(request, response, next)

    expect(logger.error).toHaveBeenCalledWith('logout callback error', 'Error')
    expect(logger.error).toHaveBeenCalledWith('access denied logout error', 'Error')
    expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain(error.message)
    expect(consoleError).not.toHaveBeenCalled()
    expect(next).toHaveBeenNthCalledWith(1, error)
    expect(next).toHaveBeenNthCalledWith(2, error)
    consoleError.mockRestore()
    deleteRequest.mockRestore()
})

test('verifyLogin does not log user profile data on access denial', () => {
    const logger = getMockLogger()
    const strategy = new TestStrategy(logger)
    const user = {
        userinfo: { roles: ['blocked-role'] },
        userInfo: { email: 'synthetic-user@example.test', identity: 'synthetic-private-identity' },
    }
    const request = { logIn: (_user: unknown, callback: (error?: Error) => void) => callback() } as unknown as Request
    const response = {} as Response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- configure only the role gate used by this test.
    ;(strategy as any).options = { allowRolesRegex: 'allowed-role' }
    jest.spyOn(strategy, 'accessDenied').mockImplementation()

    strategy.verifyLogin(request, user, jest.fn(), response)

    const diagnostic = JSON.stringify([...(logger.log as jest.Mock).mock.calls, ...(logger.info as jest.Mock).mock.calls])
    expect(diagnostic).not.toContain('synthetic-user@example.test')
    expect(diagnostic).not.toContain('synthetic-private-identity')
})
