import { xuiNode, XuiNode } from './xuiNode.class'
import { Router, Response } from 'express'
import { XuiNodeOptions } from './xuiNodeOptions.interface'
import { XuiNodeMiddlewareInterface } from './xuiNodeMiddleware.interface'
import { createMock } from '@golevelup/ts-jest';
import { createMockPassportRequest } from './test/passportRequest.mock'
import { Strategy } from '../../auth/models/strategy.class'
import { XuiLogger } from '../util/debug.logger'

class DelayedStrategy extends Strategy {
    constructor(router: Router, logger: XuiLogger, initialization: Promise<void>) {
        super('oidc', router, logger)
        this.initialiseStrategy = async () => initialization
    }
}

const createRouter = (): Router => Object.assign(jest.fn(), { use: jest.fn(), get: jest.fn() }) as unknown as Router

const authOptions = {
    authorizationURL: 'https://idam.test/auth',
    tokenURL: 'https://idam.test/token',
    clientID: 'client-id',
    clientSecret: 'client-secret',
    callbackURL: 'https://service.test/callback',
    scope: 'openid',
    logoutURL: 'https://idam.test/logout',
    discoveryEndpoint: 'https://idam.test/.well-known',
    issuerURL: 'https://idam.test',
    responseTypes: ['code'],
    tokenEndpointAuthMethod: 'client_secret_basic',
    useRoutes: false,
}

jest.mock('../../auth', () => ({
    oidc: {},
    OIDC: {},
    oauth2: {},
    XUIOAuth2Strategy: {},
    OAUTH2: {},
    s2s: {},
    S2S: {},
}))

test('xuiNode isTruthy', () => {
    expect(xuiNode).toBeTruthy()
})

test('xuiNode configure waits for middleware setup in order before handling requests', async () => {
    const mockRouter = jest.fn() as unknown as Router
    const logger = createMock<typeof console>()
    const middlewares: Array<string> = ['session', 'auth']
    const xuinode = new XuiNode(mockRouter, middlewares, logger)
    const options = { authorizationURL: 'http://localhost/someauthurl' } as XuiNodeOptions
    const configured: string[] = []
    let releaseSession: () => void = () => {}
    let releaseAuth: () => void = () => {}
    const sessionReady = new Promise<void>((resolve) => { releaseSession = resolve })
    const authReady = new Promise<void>((resolve) => { releaseAuth = resolve })
    const spy = jest.spyOn(xuinode, 'applyMiddleware')
        .mockImplementation(async (middleware, middlewareOptions) => {
            configured.push(middleware)
            if (middleware === 'session') await sessionReady
            if (middleware === 'auth') await authReady
            expect(middlewareOptions).toBe(options)
        })
    const handler = xuinode.configure(options)
    const req = createMockPassportRequest(null)
    const resp = createMock<Response>()
    const next = jest.fn()
    handler(req, resp, next)

    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(configured).toEqual(['session'])
    expect(mockRouter).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()

    releaseSession()
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(configured).toEqual(['session', 'auth'])
    expect(mockRouter).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()

    releaseAuth()
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(mockRouter).toHaveBeenCalledWith(req, resp, next)
    expect(spy).toHaveBeenCalledTimes(2)
})

test('xuiNode configure forwards an earlier setup failure without entering the router', async () => {
    const mockRouter = jest.fn() as unknown as Router
    const logger = createMock<typeof console>()
    const xuinode = new XuiNode(mockRouter, ['session', 'auth'], logger)
    const error = new Error('session setup failed')
    jest.spyOn(xuinode, 'applyMiddleware').mockRejectedValue(error)
    const handler = xuinode.configure({ session: {} } as XuiNodeOptions)
    const req = createMockPassportRequest(null)
    const resp = createMock<Response>()
    const next = jest.fn()
    await new Promise<void>((resolve) => setImmediate(resolve))
    handler(req, resp, next)
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(mockRouter).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(error)
})

test('xuiNode does not route before the real auth strategy finishes initialization', async () => {
    const authRouter = createRouter()
    const nodeRouter = createRouter()
    const logger = createMock<typeof console>()
    let releaseInitialization: () => void = () => {}
    const initialization = new Promise<void>((resolve) => { releaseInitialization = resolve })
    const strategy = new DelayedStrategy(authRouter, logger, initialization)
    for (const method of ['serializeUser', 'deserializeUser', 'initializeTrustProxy', 'initializePassport', 'initializeSession', 'initializeKeepAlive', 'initialiseCSRF', 'addHeaders'] as const) {
        jest.spyOn(strategy, method).mockImplementation(() => {})
    }
    const xuiNode = new XuiNode(nodeRouter, ['session', 'auth'], logger)
    const importMiddleware = jest.spyOn(xuiNode, 'importMiddleware').mockResolvedValue({ oidc: strategy } as unknown as Awaited<ReturnType<typeof xuiNode.importMiddleware>>)
    const waitUntilReady = jest.spyOn(strategy, 'waitUntilReady')
    const handler = xuiNode.configure({ auth: { oidc: authOptions } } as XuiNodeOptions)
    const req = createMockPassportRequest(null)
    const res = createMock<Response>()
    const next = jest.fn()

    handler(req, res, next)
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(importMiddleware).toHaveBeenCalledWith('auth')
    expect(waitUntilReady).toHaveBeenCalledTimes(1)
    expect(nodeRouter).not.toHaveBeenCalled()

    releaseInitialization()
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(nodeRouter.use).toHaveBeenCalledTimes(1)
    expect(nodeRouter).toHaveBeenCalledWith(req, res, next)
})

test('xuiNode forwards OIDC initialization failures and does not route requests', async () => {
    const authRouter = createRouter()
    const nodeRouter = createRouter()
    const logger = createMock<typeof console>()
    let failInitialization: (error: Error) => void = () => {}
    const initialization = new Promise<void>((_resolve, reject) => { failInitialization = reject })
    const strategy = new DelayedStrategy(authRouter, logger, initialization)
    for (const method of ['serializeUser', 'deserializeUser', 'initializeTrustProxy', 'initializePassport', 'initializeSession', 'initializeKeepAlive', 'initialiseCSRF', 'addHeaders'] as const) {
        jest.spyOn(strategy, method).mockImplementation(() => {})
    }
    const xuiNode = new XuiNode(nodeRouter, ['session', 'auth'], logger)
    jest.spyOn(xuiNode, 'importMiddleware').mockResolvedValue({ oidc: strategy } as unknown as Awaited<ReturnType<typeof xuiNode.importMiddleware>>)
    const handler = xuiNode.configure({ auth: { oidc: authOptions } } as XuiNodeOptions)
    const req = createMockPassportRequest(null)
    const res = createMock<Response>()
    const next = jest.fn()
    const error = new Error('discovery failed')

    handler(req, res, next)
    failInitialization(error)
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(nodeRouter).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(error)
})

test('xuiNode configure forwards router errors through Express', async () => {
    const error = new Error('router failed')
    const mockRouter = jest.fn(() => { throw error }) as unknown as Router
    const xuinode = new XuiNode(mockRouter, [], createMock<typeof console>())
    const handler = xuinode.configure({} as XuiNodeOptions)
    const next = jest.fn()

    handler(createMockPassportRequest(null), createMock<Response>(), next)
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(error)
})

test('applyMiddlewareLayer() should call importMiddleware with the baseDir and middleware', () => {
    const xuiNodeOptions = { session1: 'someValue' }
    const middleware = 'session1'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const spyOnImportMiddleware = jest.spyOn(xuiNode, 'importMiddleware').mockReturnValue(Promise.resolve({} as any))

    xuiNode.applyMiddleware(middleware, xuiNodeOptions)

    expect(spyOnImportMiddleware).toHaveBeenCalledWith(middleware)
})

test('importMiddleware should throw error', async () => {
    await xuiNode.importMiddleware('invalidMiddleware').catch((error) => {
        expect(error.message).toEqual('unknown middleware')
    })
})

test('importMiddleware should return auth', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const auth = (await xuiNode.importMiddleware('auth')) as any
    expect(auth.oidc).toBeTruthy()
    expect(auth.OIDC).toBeTruthy()
    expect(auth.oauth2).toBeTruthy()
    expect(auth.XUIOAuth2Strategy).toBeTruthy()
    expect(auth.OAUTH2).toBeTruthy()
    expect(auth.s2s).toBeTruthy()
    expect(auth.S2S).toBeTruthy()
})

test('importMiddleware should return session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const session = (await xuiNode.importMiddleware('session')) as any
    expect(session.redisStore).toBeTruthy()
    expect(session.fileStore).toBeTruthy()
    expect(session.SESSION).toBeTruthy()
})

test('proxyEvents ', () => {
    const middleWare = createMock<XuiNodeMiddlewareInterface>()
    const spyOnMiddleware = jest.spyOn(middleWare, 'getEvents').mockReturnValue(['event1', 'event2'])
    const spyOnXuinode = jest.spyOn(xuiNode, 'listenerCount').mockReturnValue(0)
    xuiNode.proxyEvents(middleWare)
    expect(spyOnMiddleware).toHaveBeenCalledWith()
    expect(spyOnXuinode).toHaveBeenCalledWith('event1')
    expect(spyOnXuinode).toHaveBeenCalledWith('event2')
})

test('defaultAuthenticate, fake authenticated', () => {
    const mockRouter = {} as Router
    const logger = createMock<typeof console>()
    const middlewares: Array<string> = []
    const xuinode = new XuiNode(mockRouter, middlewares, logger)
    const options = { authorizationURL: 'http://localhost/someauthurl' } as XuiNodeOptions
    xuinode.configure(options)
    const req = createMockPassportRequest('user')
    const resp = createMock<Response>()
    resp.statusCode = 0
    const next = jest.fn()
    xuinode.authenticate(req, resp, next)
    expect(resp.statusCode).toEqual(0)
    expect(next).toHaveBeenCalledTimes(1)
})

test('defaultAuthenticate, unauthenticated', () => {
    const mockRouter = {} as Router
    const logger = createMock<typeof console>()
    const middlewares: Array<string> = []
    const xuinode = new XuiNode(mockRouter, middlewares, logger)
    const options = { authorizationURL: 'http://localhost/someauthurl' } as XuiNodeOptions
    xuinode.configure(options)
    const req = createMockPassportRequest(null)
    const resp = createMock<Response>()
    jest.spyOn(resp, 'status').mockReturnValue(resp)
    resp.statusCode = 0
    const next = jest.fn()

    xuinode.authenticate(req, resp, next)
    expect(resp.statusCode).toEqual(401)
    expect(resp.status).toHaveBeenCalledWith(401)
    expect(resp.send).toHaveBeenCalledWith({ message: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
})
