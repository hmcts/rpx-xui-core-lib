

import { oidc, OpenID } from './openid.class'
import passport from 'passport'
import express, { NextFunction, Request, response, Response, Router } from 'express'
import { AUTH } from '../../auth.constants'
import { Client, custom, Issuer, Strategy, TokenSet, UserinfoResponse } from 'openid-client'
import { createMock } from '@golevelup/ts-jest';
import { OpenIDMetadata } from './OpenIDMetadata.interface'
import { VERIFY_ERROR_MESSAGE_NO_ACCESS_ROLES } from '../../messaging.constants'
import { http } from '../../../common/http'
import { XuiLogger } from '../../../common/util/debug.logger'
import { AuthOptions } from '../../models'
import { MySessionData } from '../../models/sessionData.interface'
import { createMockPassportRequest } from '../../../common/models/test/passportRequest.mock'

const mockRequestRequired = {
    authorizationURL: '',
    tokenURL: '',
    clientID: '',
    clientSecret: '',
    callbackURL: '',
}

const options = {
    authorizationURL: 'http://localhost/someAuthorizationURL',
    tokenURL: 'http://localhost/1234',
    clientID: 'clientID12',
    clientSecret: 'secret123',
    discoveryEndpoint: 'http://localhost/someEndpoint',
    issuerURL: 'http://localhost/issuer_url',
    logoutURL: 'http://localhost/testUrl',
    callbackURL: 'http://localhost/callback',
    responseTypes: ['none'],
    scope: 'some scope',
    sessionKey: 'key',
    tokenEndpointAuthMethod: 'client_secret_basic',
    useRoutes: true,
    routeCredential: {
        userName: 'username@email.com',
        password: 'password123',
        routes: ['route1'],
        scope: 'scope1 scope2',
    },
}

test('OIDC Auth', () => {
    expect(oidc).toBeDefined()
})

test('OIDC configure strategy', () => {
    const spy = jest.spyOn(passport, 'use')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const strategy = {} as Strategy<any, any>
    oidc.useStrategy('name', strategy)
    expect(spy).toHaveBeenCalledWith('name', strategy)
})

test('OIDC configure serializeUser', () => {
    const spy = jest.spyOn(passport, 'serializeUser')
    oidc.serializeUser()
    expect(spy).toHaveBeenCalled()
})

test('OIDC configure deserializeUser', () => {
    const spy = jest.spyOn(passport, 'deserializeUser')
    oidc.deserializeUser()
    expect(spy).toHaveBeenCalled()
})

test('OIDC loginHandler', async () => {
    const spy = jest.spyOn(passport, 'authenticate')
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
    } as unknown as Request
    const mockResponse = {} as Response
    const next = jest.fn()

    await oidc.loginHandler(mockRequest, mockResponse, next)
    expect(spy).toHaveBeenCalled()
})

test('OIDC loginHandler with session', async () => {
    const mockRouter = createMock<Router>()
    options.sessionKey = 'test'
    const logger = {
        log: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
    } as unknown as XuiLogger
    const openId = new OpenID(mockRouter, logger)
    jest.spyOn(openId, 'validateOptions')
    jest.spyOn(openId, 'serializeUser')
    jest.spyOn(openId, 'deserializeUser')
    jest.spyOn(openId, 'initializePassport')
    jest.spyOn(openId, 'initializeSession')
    jest.spyOn(openId, 'initialiseStrategy').mockResolvedValue()
    jest.spyOn(openId, 'initialiseCSRF')
    options.useRoutes = true
    openId.configure(options)

    const spy = jest.spyOn(passport, 'authenticate')
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
        session: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
            save: (callback: any): void => callback(),
        },
    } as unknown as Request
    const mockResponse = {} as Response
    const next = jest.fn()

    await openId.loginHandler(mockRequest, mockResponse, next)
    expect(spy).toHaveBeenCalled()
})

test('OIDC loginHandler reports safe error details without returning raw credentials', async () => {
    const logger = createMock<XuiLogger>()
    const openId = new OpenID(Router({ mergeParams: true }), logger)
    const error = new Error('request failed with access_token=synthetic-access-token')
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation(() => {
        throw error
    })

    await expect(openId.loginHandler({ session: {}, query: {} } as Request, {} as Response, jest.fn()))
        .rejects.toThrow('OIDC login handler failed')

    const diagnostic = JSON.stringify(logger.error.mock.calls)
    expect(diagnostic).toContain('Error')
    expect(diagnostic).not.toContain(error.message)
    expect(diagnostic).not.toContain('synthetic-access-token')
    authenticate.mockRestore()
})

test('OIDC loginHandler passes single-string login_hint with generated state', async () => {
    const mockRouter = createMock<Router>()
    const logger = {
        log: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    } as unknown as XuiLogger
    const openId = new OpenID(mockRouter, logger)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    ;(openId as any).options = { sessionKey: 'test' }
    const spy = jest.spyOn(passport, 'authenticate').mockImplementation(() => jest.fn())
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
        query: { login_hint: 'ejudiciary-aad' },
        session: {
            callbackURL: 'http://localhost/callback',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
            save: (callback: any): void => callback(),
        },
    } as unknown as Request
    const mockResponse = {} as Response
    const next = jest.fn()

    await openId.loginHandler(mockRequest, mockResponse, next)

    expect(spy).toHaveBeenCalledWith(
        openId.strategyName,
        expect.objectContaining({
            redirect_uri: 'http://localhost/callback',
            login_hint: 'ejudiciary-aad',
            state: expect.any(String),
            nonce: expect.any(String),
        }),
        expect.any(Function),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    expect((mockRequest.session as any).test.state).toEqual(expect.any(String))
})

test('OIDC loginHandler ignores non-string login_hint values', async () => {
    const mockRouter = createMock<Router>()
    const logger = {
        log: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    } as unknown as XuiLogger
    const openId = new OpenID(mockRouter, logger)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    ;(openId as any).options = { sessionKey: 'test' }
    const spy = jest.spyOn(passport, 'authenticate').mockImplementation(() => jest.fn())
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
        query: { login_hint: ['ejudiciary-aad'] },
        session: {
            callbackURL: 'http://localhost/callback',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
            save: (callback: any): void => callback(),
        },
    } as unknown as Request
    const mockResponse = {} as Response
    const next = jest.fn()

    await openId.loginHandler(mockRequest, mockResponse, next)

    const authenticateOptions = spy.mock.calls[spy.mock.calls.length - 1][1] as Record<string, unknown>
    expect(authenticateOptions).not.toHaveProperty('login_hint')
})

test('OIDC jwTokenExpired', () => {
    let jwtData = { exp: new Date('Jun 04, 2020').getTime() / 1000 }
    let isTokenExpired = oidc.jwTokenExpired(jwtData)
    expect(isTokenExpired).toBeTruthy()

    jwtData = { exp: new Date().getTime() / 1000 }
    isTokenExpired = oidc.jwTokenExpired(jwtData)
    expect(isTokenExpired).toBeFalsy()
})

test('OIDC configure initializePassport', () => {
    const spy = jest.spyOn(passport, 'initialize')
    oidc.initializePassport()
    expect(spy).toHaveBeenCalled()
})

test('OIDC configure initializeSession', () => {
    const spy = jest.spyOn(passport, 'session')
    oidc.initializeSession()
    expect(spy).toHaveBeenCalled()
})

test('OIDC OptionsMapper', () => {
    const options = {
        authorizationURL: '',
        tokenURL: '',
        clientID: 'clientId',
        clientSecret: 'Clientsecret',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'logouturl',
        callbackURL: 'http://localhost/callback',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
    }
    const openIdOptions = oidc.getOpenIDOptions(options, { issuer: options.issuerURL })

    expect(openIdOptions.client_id).toEqual(options.clientID)
    expect(openIdOptions.client_secret).toEqual(options.clientSecret)
    expect(openIdOptions.discovery_endpoint).toEqual(options.discoveryEndpoint)
    expect(openIdOptions.issuer_url).toEqual(options.issuerURL)
    expect(openIdOptions.logout_url).toEqual(options.logoutURL)
    expect(openIdOptions.response_types).toEqual(options.responseTypes)
    expect(openIdOptions.scope).toEqual(options.scope)
    expect(openIdOptions.sessionKey).toEqual(options.sessionKey)
    expect(openIdOptions.token_endpoint_auth_method).toEqual(options.tokenEndpointAuthMethod)
    expect(openIdOptions.useRoutes).toEqual(options.useRoutes)
})

test('test validateOptions', () => {
    const options = {
        authorizationURL: '',
        tokenURL: '454',
        clientID: 'clientId',
        clientSecret: 'Clientsecret',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'logouturl',
        callbackURL: 'redirect_uri',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
    }
    expect(() => {
        oidc.validateOptions(options)
    }).toThrow('authorizationURL')

    //positive case
    options.authorizationURL = 'something'
    const isValid = oidc.validateOptions(options)
    expect(isValid).toBeTruthy()
})

test('OIDC verifyLogin error Path', () => {
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
    } as unknown as Request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    mockRequest.logIn = (user: any, optionsOrDone: any, maybeDone?: (err: any) => void) => {
        if (typeof optionsOrDone === 'function') {
            optionsOrDone({})
        } else if (maybeDone) {
            maybeDone({})
        }
    }
    const mockResponse = {} as Response
    const next = jest.fn()
    const user = {
        userinfo: {
            roles: ['test', 'admin'],
        },
    }

    oidc.verifyLogin(mockRequest, user, next, mockResponse)
    expect(next).toHaveBeenCalledWith({})
})

test('OIDC verifyLogin happy Path with no subscription', () => {
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
    } as unknown as Request
    mockRequest.csrfToken = jest.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    mockRequest.logIn = (user: any, optionsOrDone: any, maybeDone?: (err: any) => void) => {
        if (typeof optionsOrDone === 'function') {
            optionsOrDone()
        } else if (maybeDone) {
            maybeDone({})
        }
    }
    const mockResponse = {} as Response
    const mockRedirect = jest.fn()
    mockResponse.cookie = jest.fn()
    mockResponse.redirect = mockRedirect
    const next = jest.fn()
    const user = {
        userinfo: {
            roles: ['test', 'admin'],
        },
    }
    oidc.verifyLogin(mockRequest, user, next, mockResponse)
    expect(next).not.toHaveBeenCalledWith({})
    expect(mockRedirect).toHaveBeenCalledWith(AUTH.ROUTE.DEFAULT_REDIRECT)
})

test('OIDC verifyLogin happy Path with subscription', () => {
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
    } as unknown as Request
    mockRequest.csrfToken = jest.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    mockRequest.logIn = (user: any, optionsOrDone: any, maybeDone?: (err: any) => void) => {
        if (typeof optionsOrDone === 'function') {
            optionsOrDone()
        } else if (maybeDone) {
            maybeDone({})
        }
    }
    const mockResponse = {} as Response
    mockResponse.cookie = jest.fn()
    mockResponse.redirect = jest.fn()
    const next = jest.fn()
    const user = {
        userinfo: {
            roles: ['test', 'admin'],
        },
    }

    oidc.addListener(AUTH.EVENT.AUTHENTICATE_SUCCESS, (req) => {
        expect(req.isRefresh).toBeFalsy()
    })
    oidc.verifyLogin(mockRequest, user, next, mockResponse)
    expect(next).not.toHaveBeenCalledWith({})
    oidc.removeAllListeners()
})

test('OIDC verifyLogin clears session and redirects to access denied when roles do not match', async () => {
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
        session: {
            destroy: jest.fn((callback) => callback()),
        },
    } as unknown as Request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    mockRequest.logIn = (user: any, optionsOrDone: any, maybeDone?: (err?: any) => void) => {
        if (typeof optionsOrDone === 'function') {
            optionsOrDone()
        } else if (maybeDone) {
            maybeDone()
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    ;(mockRequest as any).logout = jest.fn((_options, callback) => callback())
    const mockResponse = {} as Response
    mockResponse.redirect = jest.fn()
    const next = jest.fn()
    const logoutSpy = jest.spyOn(oidc, 'logout')
    const accessDeniedEventSpy = jest.fn()
    const user = {
        userinfo: {
            roles: ['citizen'],
        },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    ;(oidc as any).options.allowRolesRegex = 'caseworker'
    oidc.on(AUTH.EVENT.AUTHENTICATE_ACCESS_DENIED, accessDeniedEventSpy)

    oidc.verifyLogin(mockRequest, user, next, mockResponse)
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(accessDeniedEventSpy).toHaveBeenCalledWith(mockRequest, mockResponse, next, {
        allowRolesRegex: 'caseworker',
        roles: ['citizen'],
        userinfo: user.userinfo,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    expect((mockRequest as any).logout).toHaveBeenCalledWith({ keepSessionInfo: false }, expect.any(Function))
    expect(mockRequest.session?.destroy).toHaveBeenCalled()
    expect(mockResponse.redirect).toHaveBeenCalledWith(AUTH.ROUTE.ACCESS_DENIED)
    expect(logoutSpy).not.toHaveBeenCalled()
    oidc.removeListener(AUTH.EVENT.AUTHENTICATE_ACCESS_DENIED, accessDeniedEventSpy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    ;(oidc as any).options.allowRolesRegex = '.'
})

test('OIDC discoverIssuer', async () => {
    const spy = jest.spyOn(Issuer, 'discover').mockImplementation(() => Promise.resolve({} as Issuer<Client>))
    await oidc.discoverIssuer()
    expect(spy).toHaveBeenCalled()
})

test('OIDC discover', async () => {
    const issuer = {}
    const spy = jest.spyOn(oidc, 'discoverIssuer').mockImplementation(() => Promise.resolve({ metadata: issuer }))

    await oidc.discover()
    expect(spy).toHaveBeenCalled()
})

test('OIDC authenticate when authenticated but session and client not initialised', () => {
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
    } as unknown as Request
    // @ts-expect-error it's a mock
    mockRequest.isUnauthenticated = () => false
    const statusFn = (n: number) => {
        mockResponse.statusCode = n
        return mockResponse
    }
    const mockResponse = { status: statusFn } as Response
    mockResponse.send = jest.fn(() => mockResponse)
    const mockRedirect = jest.fn()
    mockResponse.redirect = mockRedirect

    const next = jest.fn()
    oidc.authenticate(mockRequest, mockResponse, next)
    expect(mockResponse.send).toHaveBeenCalled()
})

test('OIDC authenticate accepts an authenticated passport session', async () => {
    const mockRequest = createMockPassportRequest('user')
    const mockResponse = {} as Response
    const mockRedirect = jest.fn()
    mockResponse.redirect = mockRedirect

    const session = createMock<MySessionData>()
    session.passport = {
        user: {
            tokenset: {
                accessToken: 'token-access',
            },
            userinfo: {
                roles: ['role1', 'role2'],
            },
        },
    }
    mockRequest.session = session
    mockRequest.headers = {}
    const statusFn = (n: number) => {
        mockResponse.statusCode = n
        return mockResponse
    }
    mockResponse.status = statusFn
    mockResponse.send = jest.fn(() => mockResponse)
    const next = jest.fn()
    await oidc.authenticate(mockRequest, mockResponse, next)
    expect(next).toHaveBeenCalled()
    expect(mockResponse.statusCode).toBeUndefined()
})

test('OIDC initialiseStrategy', async () => {
    const spyGetNewStrategy = jest
        .spyOn(oidc, 'createNewStrategy')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
        .mockImplementation(() => Promise.resolve({} as Strategy<any, any>))
    const spyUseStrategy = jest.spyOn(oidc, 'useStrategy')

    const options = {
        authorizationURL: '',
        tokenURL: '',
        clientID: 'clientId',
        clientSecret: 'Clientsecret',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'logouturl',
        callbackURL: 'redirect_uri',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
    }

    await oidc.initialiseStrategy(options)
    expect(spyGetNewStrategy).toHaveBeenCalled()
    expect(spyUseStrategy).toHaveBeenCalled()
})

test('test createNewStrategy', async () => {
    const options = {
        authorizationURL: 'http://oauth/authorize',
        tokenURL: '',
        clientID: 'clientId',
        clientSecret: 'Clientsecret',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'logouturl',
        callbackURL: 'http://oauth/callback',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
    }
    const spyGetOptions = jest.spyOn(oidc, 'getOpenIDOptions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const spyDiscover = jest.spyOn(oidc, 'discover').mockImplementation(() => Promise.resolve({} as Issuer<any>))
    const spyGetClient = jest.spyOn(oidc, 'getClientFromIssuer').mockReturnValue({} as Client)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const spyOnStrategy = jest.spyOn(oidc, 'getNewStrategy').mockReturnValue({} as Strategy<any, Client>)
    await oidc.createNewStrategy(options)

    expect(spyDiscover).toHaveBeenCalled()
    expect(spyGetOptions).toHaveBeenCalled()
    expect(spyGetClient).toHaveBeenCalled()
    expect(spyOnStrategy).toHaveBeenCalled()
})

test('verify() Should return a no access roles messages if the User has no roles.', async () => {
    const tokenSet = {} as TokenSet
    const userinfo = {} as UserinfoResponse

    const doneFunction = jest.fn()

    oidc.verify(tokenSet, userinfo, doneFunction)

    expect(doneFunction).toHaveBeenCalledWith(null, false, { message: VERIFY_ERROR_MESSAGE_NO_ACCESS_ROLES })
})

test('verify() Should return the user token set if a User has roles.', async () => {
    const tokenSet = createMock<TokenSet>()
    const userinfo = createMock<UserinfoResponse>()

    userinfo.roles = ['pui-case-manager']
    tokenSet.access_token = 'access_token'
    tokenSet.refresh_token = 'refresh_token'
    tokenSet.id_token = 'id_token'

    const userTokenSet = {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        idToken: tokenSet.id_token,
    }

    const doneFunction = jest.fn()

    oidc.verify(tokenSet, userinfo, doneFunction)

    expect(doneFunction).toHaveBeenCalledWith(null, { tokenset: userTokenSet, userinfo })
})

test('verify() does not log user profile fields or token values', () => {
    const logger = createMock<XuiLogger>()
    const openId = new OpenID(Router({ mergeParams: true }), logger)
    const userinfo = {
        roles: ['pui-case-manager'],
        email: 'synthetic-user@example.test',
        uid: 'synthetic-private-identity',
        sub: 'synthetic-subject',
    } as UserinfoResponse
    const tokens = {
        access_token: 'synthetic-access-token',
        refresh_token: 'synthetic-refresh-token',
        id_token: 'synthetic-id-token',
    } as TokenSet

    openId.verify(tokens, userinfo, jest.fn())

    const diagnostic = JSON.stringify(logger.info.mock.calls)
    for (const sensitiveValue of [userinfo.email, userinfo.uid, tokens.access_token, tokens.refresh_token, tokens.id_token]) {
        expect(diagnostic).not.toContain(sensitiveValue)
    }
    expect(logger.info).toHaveBeenCalledWith('OIDC user verification succeeded')
})

test('OIDC strategy diagnostics omit option values and discovery URL queries', async () => {
    const logger = createMock<XuiLogger>()
    const openId = new OpenID(Router({ mergeParams: true }), logger)
    const authOptions = {
        ...options,
        clientSecret: 'synthetic-client-secret',
        discoveryEndpoint: 'https://idam.test/.well-known?access_token=synthetic-query-token',
    }
    const issuer = { metadata: { issuer: 'https://idam.test' } } as Issuer<Client>
    jest.spyOn(openId, 'discover').mockResolvedValue(issuer)
    jest.spyOn(openId, 'getClientFromIssuer').mockReturnValue({} as Client)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the test returns a placeholder Passport strategy.
    jest.spyOn(openId, 'getNewStrategy').mockReturnValue({} as Strategy<any, Client>)

    await openId.createNewStrategy(authOptions)

    const diagnostic = JSON.stringify([...logger.log.mock.calls, ...logger.info.mock.calls])
    expect(diagnostic).not.toContain('synthetic-client-secret')
    expect(diagnostic).not.toContain('synthetic-query-token')
})

test('OIDC HTTP diagnostics omit request URLs and query parameters', () => {
    const logger = createMock<XuiLogger>()
    const httpDefaults = jest.spyOn(custom, 'setHttpOptionsDefaults')
    new OpenID(Router({ mergeParams: true }), logger)
    const configured = httpDefaults.mock.calls[0][0] as unknown as { hooks: {
        beforeRequest: Array<(request: { method: string; href: string }) => void>
        afterResponse: Array<(response: { statusCode: number; request: { gotOptions: { method: string; href: string } } }) => unknown>
    } }
    const hooks = configured.hooks

    hooks.beforeRequest[0]({ method: 'get', href: 'https://idam.test/token?access_token=synthetic-query-token' })
    hooks.afterResponse[0]({
        statusCode: 200,
        request: { gotOptions: { method: 'post', href: 'https://idam.test/token?client_secret=synthetic-client-secret' } },
    })

    const diagnostic = JSON.stringify(logger.log.mock.calls)
    expect(diagnostic).not.toContain('https://idam.test')
    expect(diagnostic).not.toContain('synthetic-query-token')
    expect(diagnostic).not.toContain('synthetic-client-secret')
    httpDefaults.mockRestore()
})

test('Should return an object from getClientFromIssuer()', async () => {
    const issuer = createMock<Issuer<Client>>()
    const options = createMock<OpenIDMetadata>()

    expect(oidc.getClientFromIssuer(issuer, options)).toBeDefined()
})

test('makeAuthorization() Should make an authorisation string', async () => {
    const passport = {
        user: {
            tokenset: {
                accessToken: 'accessToken',
            },
        },
    }

    const expectedAuthorisation = `Bearer ${passport.user.tokenset.accessToken}`

    expect(oidc.makeAuthorization(passport)).toEqual(expectedAuthorisation)
})

test('strategy logout', async () => {
    const session = createMock<MySessionData>()
    const mockRequest = createMock<Request>()
    mockRequest.query = { noredirect: '1' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    ;(mockRequest.logout as jest.Mock).mockImplementation((_options: any, callback: (error?: any) => void) => callback())
    const mockNextFunction = createMock<NextFunction>()
    session.passport = {
        user: {
            tokenset: {
                accessToken: 'access t',
                refreshToken: 'refresh34',
            },
            userinfo: {
                roles: ['role1'],
            },
        },
    }
    mockRequest.session = session
    const mockResponse = { status: jest.fn() } as unknown as Response
    jest.mocked(mockResponse.status).mockReturnValue(mockResponse)
    mockResponse.send = jest.fn().mockReturnValue(mockResponse)
    mockResponse.redirect = jest.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const spyhttp = jest.spyOn(http, 'delete').mockImplementation(() => Promise.resolve({} as any))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const spySessionDestroy = jest.spyOn(oidc, 'destroySession').mockImplementation(() => Promise.resolve({} as any))
    await oidc.logout(mockRequest, mockResponse, mockNextFunction)
    expect(spyhttp).toHaveBeenCalled()
    expect(spySessionDestroy).toHaveBeenCalled()
})

test('urlFromToken ', () => {
    const url = oidc.urlFromToken('http://localhost', 'token1')
    expect(url).toEqual('http://localhost/session/token1')
})

test('getAuthorization', () => {
    let auth = oidc.getAuthorization('clientID', 'secret', 'base64')
    let buffer = Buffer.from('clientID:secret').toString('base64')
    expect(auth).toEqual(`Basic ${buffer}`)

    auth = oidc.getAuthorization('clientID', 'secret')
    buffer = Buffer.from('clientID:secret').toString('base64')
    expect(auth).toEqual(`Basic ${buffer}`)
})

test('getEvents ', () => {
    const events = oidc.getEvents()
    expect(events).toEqual([
        'auth.authenticate.success',
        'auth.serializeUser',
        'auth.deserializeUser',
        'auth.authenticate.failure',
        'auth.authenticate.accessDenied',
    ])
})

test('emitIfListenersExist with no listeners', () => {
    const done = jest.fn()
    jest.spyOn(oidc, 'listenerCount').mockReturnValue(0)
    oidc.emitIfListenersExist('eventName', 'id', done)
    expect(done).toHaveBeenCalledWith(null, 'id')
})

test('emitIfListenersExist with listeners', () => {
    jest.spyOn(oidc, 'listenerCount').mockReturnValue(1)
    const spyEmit = jest.spyOn(oidc, 'emit')
    const done = jest.fn()
    oidc.emitIfListenersExist('eventName', 'id', done)
    expect(spyEmit).toHaveBeenCalledWith('eventName', 'id', done)
})

test('configure with useRoutes', () => {
    const mockRouter = createMock<Router>()
    const logger = {
        log: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
    } as unknown as XuiLogger
    const openId = new OpenID(mockRouter, logger)
    const spyOnValidateOptions = jest.spyOn(openId, 'validateOptions')
    const spyOnSer = jest.spyOn(openId, 'serializeUser')
    const spyOnDeSer = jest.spyOn(openId, 'deserializeUser')
    const spyOnPass = jest.spyOn(openId, 'initializePassport')
    const spyOnSes = jest.spyOn(openId, 'initializeSession')
    jest.spyOn(openId, 'initialiseStrategy').mockResolvedValue()
    options.useRoutes = true
    openId.configure(options)
    expect(spyOnValidateOptions).toHaveBeenCalled()
    expect(spyOnSer).toHaveBeenCalled()
    expect(spyOnDeSer).toHaveBeenCalled()
    expect(spyOnPass).toHaveBeenCalled()
    expect(spyOnSes).toHaveBeenCalled()
    expect(mockRouter.get).toHaveBeenCalledTimes(5)
})

test('configure without useRoutes', () => {
    const mockRouter = createMock<Router>()
    const logger = {
        log: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
    } as unknown as XuiLogger
    const openId = new OpenID(mockRouter, logger)
    const spyOnValidateOptions = jest.spyOn(openId, 'validateOptions')
    const spyOnSer = jest.spyOn(openId, 'serializeUser')
    const spyOnDeSer = jest.spyOn(openId, 'deserializeUser')
    const spyOnPass = jest.spyOn(openId, 'initializePassport')
    const spyOnSes = jest.spyOn(openId, 'initializeSession')
    jest.spyOn(openId, 'initialiseStrategy').mockResolvedValue()

    options.useRoutes = false
    openId.configure(options)
    expect(spyOnValidateOptions).toHaveBeenCalled()
    expect(spyOnSer).toHaveBeenCalled()
    expect(spyOnDeSer).toHaveBeenCalled()
    expect(spyOnPass).toHaveBeenCalled()
    expect(spyOnSes).toHaveBeenCalled()
    expect(mockRouter.get).not.toHaveBeenCalled()
})

test('getClient', () => {
    const client = oidc.getClient()
    expect(client).toBeTruthy()
})

test('keepAliveHandler no session', async () => {
    const mockRequest = {
        ...mockRequestRequired,
        body: {},
    } as unknown as Request
    const mockResponse = {} as Response
    const next = jest.fn()
    await oidc.keepAliveHandler(mockRequest, mockResponse, next)
    expect(next).toHaveBeenCalled()
})

test('keepAliveHandler session but not authenticated', async () => {
    const mockResponse = {} as Response
    const next = jest.fn()
    const session = createMock<MySessionData>()
    session.passport = {
        user: {
            tokenset: {
                accessToken: 'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDAwMDAwMDB9.signature',
            },
            userinfo: {
                roles: ['role1', 'role2'],
            },
        },
    }
    const mockRequestProps = {
        ...mockRequestRequired,
        body: {},
        session: session
    }

    const mockRequest = createMockPassportRequest('user', mockRequestProps)
    const isAuth = jest.fn()
    isAuth.mockReturnValue(false)

    await oidc.keepAliveHandler(mockRequest, mockResponse, next)
    expect(next).toHaveBeenCalled()
})

test('keepAliveHandler session and isAuthenticated uses introspection for refresh', async () => {
    const mockResponse = {} as Response
    const next = jest.fn()
    const session = createMock<MySessionData>()
    session.passport = {
        user: {
            tokenset: {
                accessToken: 'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDAwMDAwMDB9.signature',
            },
            userinfo: {
                roles: ['role1', 'role2'],
            },
        },
    }
    const mockRequestProps = {
        ...mockRequestRequired,
        body: {},
        session: session
    }

    const mockRequest = createMockPassportRequest('user', mockRequestProps)
    const spyOnClient = jest.spyOn(oidc, 'getClient')
    const client = {
        issuer: { metadata: { introspection_endpoint: 'https://identity.test/introspect' } },
        introspect: jest.fn(),
        refresh: jest.fn(),
    } as unknown as Client
    spyOnClient.mockReturnValue(client)

    const spyOnIntrospect = jest.fn().mockResolvedValue({ active: true, exp: Math.floor(Date.now() / 1000) - 30 })
    client.introspect = spyOnIntrospect

    const tokenSet = createMock<TokenSet>()
    const spyOnRefresh = jest.fn().mockReturnValue(tokenSet)
    client.refresh = spyOnRefresh
    const spyConvertTokenSet = jest.spyOn(oidc, 'convertTokenSet')
    const convertedTokenSet = createMock<TokenSet>()
    spyConvertTokenSet.mockReturnValue(convertedTokenSet)

    const spyListenerCount = jest.spyOn(oidc, 'listenerCount').mockReturnValue(1)

    const spyAuthSuccEmit = jest.spyOn(oidc, 'emit').mockReturnValue(false)

    await oidc.keepAliveHandler(mockRequest, mockResponse, next)
    expect(spyOnIntrospect).toHaveBeenCalledWith('eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDAwMDAwMDB9.signature')
    expect(spyOnClient).toHaveBeenCalled()
    expect(spyOnRefresh).toHaveBeenCalled()
    expect(spyConvertTokenSet).toHaveBeenCalled()
    expect(mockRequest.session.passport.user.tokenset).toEqual(convertedTokenSet)
    expect(spyAuthSuccEmit).toHaveBeenCalledWith(AUTH.EVENT.AUTHENTICATE_SUCCESS, mockRequest, mockResponse, next)

    spyListenerCount.mockRestore()

    oidc.removeAllListeners()
})

test('getUrlFromOptions', () => {
    const mockRouter = createMock<Router>()
    const options = {
        authorizationURL: 'someAuthorizationURL',
        tokenURL: '1234',
        clientID: 'clientID12',
        clientSecret: 'secret123',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'http://testUrl',
        callbackURL: 'http://localhost/callback',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
        routeCredential: {
            userName: 'username@email.com',
            password: 'password123',
            routes: ['route1'],
            scope: 'scope1 scope2',
        },
    }
    const logger = createMock<typeof console>()
    const openId = new OpenID(mockRouter, logger)
    const url = openId.getUrlFromOptions(options)
    expect(url).toEqual('http://testUrl/o/token')
})

test('getRequestBody', () => {
    const mockRouter = createMock<Router>()
    const options = {
        authorizationURL: 'someAuthorizationURL',
        tokenURL: '1234',
        clientID: 'clientID12',
        clientSecret: 'secret123',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'http://testUrl',
        callbackURL: 'http://localhost/callback',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
        routeCredential: {
            userName: 'username@email.com',
            password: 'password123',
            routes: ['route1'],
            scope: 'scope1 scope2',
        },
    }
    const logger = createMock<typeof console>()
    const openId = new OpenID(mockRouter, logger)
    const reqBody = openId.getRequestBody(options)
    expect(reqBody).toEqual(
        'grant_type=password&password=password123&username=username%40email.com&scope=scope1+scope2&client_id=clientID12&client_secret=secret123',
    )
})

test('getRequestBody encodes every password grant field', () => {
    const options = {
        authorizationURL: 'someAuthorizationURL',
        tokenURL: '1234',
        clientID: 'client&name=example',
        clientSecret: 'secret+&=value',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'http://testUrl',
        callbackURL: 'http://localhost/callback',
        responseTypes: ['none'],
        scope: 'scope',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
        routeCredential: {
            userName: 'user+&=name',
            password: 'pass+&=word',
            routes: ['route1'],
            scope: 'read write&admin=all',
        },
    }
    const openId = new OpenID(createMock<Router>(), createMock<typeof console>())

    const body = new URLSearchParams(openId.getRequestBody(options))

    expect(Object.fromEntries(body)).toEqual({
        grant_type: 'password',
        password: options.routeCredential.password,
        username: options.routeCredential.userName,
        scope: options.routeCredential.scope,
        client_id: options.clientID,
        client_secret: options.clientSecret,
    })
})

test('getUrlFromOptions without routeCredential', () => {
    const mockRouter = createMock<Router>()
    const logger = createMock<typeof console>()
    const openId = new OpenID(mockRouter, logger)

    expect(() => openId.getUrlFromOptions({} as AuthOptions)).toThrow('missing routeCredential in options')
})

test('getRequestBody without routeCredential', () => {
    const mockRouter = createMock<Router>()
    const logger = createMock<typeof console>()
    const openId = new OpenID(mockRouter, logger)

    expect(() => openId.getRequestBody({} as AuthOptions)).toThrow('options.routeCredential missing values')
})

test('generateToken', async () => {
    const spyOnGetUrlFromOptions = jest.spyOn(oidc, 'getUrlFromOptions')
    const spyOnGetRequestBody = jest.spyOn(oidc, 'getRequestBody')
    spyOnGetUrlFromOptions.mockReturnValue('someUrl')
    spyOnGetRequestBody.mockReturnValue('somebody')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const spyHttp = jest.spyOn(http, 'post').mockImplementation(async () => await Promise.resolve({} as any))
    oidc.generateToken()
    expect(spyOnGetUrlFromOptions).toHaveBeenCalled()
    const axiosConfig = {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }
    expect(spyHttp).toHaveBeenCalledWith('someUrl', 'somebody', axiosConfig)
})

test('setHeaders should use currently signed in user when no routeCredentialToken', () => {
    const mockRouter = createMock<Router>()
    const logger = createMock<typeof console>()
    const openId = new OpenID(mockRouter, logger)
    const request = createMock<Request>()
    const next = jest.fn()
    const session = createMock<MySessionData>()
    session.passport = {
        user: {
            tokenset: {
                accessToken: 'token-access',
            },
            userinfo: {
                roles: ['role1', 'role2'],
            },
        },
    }
    request.session = session
    openId.setHeaders(request, response, next)

    expect(request.headers['user-roles']).toEqual('role1,role2')
    expect(request.headers.Authorization).toEqual('Bearer token-access')
})

test('setCredentialToken not cached', async () => {
    const request = createMock<Request>()
    const spyOnGenerateToken = jest.spyOn(oidc, 'generateToken')
    const spyOnIsTokenExpired = jest.spyOn(oidc, 'isTokenExpired')
    spyOnIsTokenExpired.mockReturnValue(true)
    spyOnGenerateToken.mockReturnValue(Promise.resolve({ access_token: 'access_token' }))
    await oidc.setCredentialToken(request)
    expect(request.headers.Authorization).toEqual('Bearer access_token')
})

test('setCredentialToken cached', async () => {
    const spyOnIsTokenExpired = jest.spyOn(oidc, 'isTokenExpired')
    spyOnIsTokenExpired.mockReturnValue(false)
    const app = express()
    app.set('routeCredentialToken', { access_token: 'access_token' })
    const request = createMockPassportRequest(null)
    request.app = app
    await oidc.setCredentialToken(request)
    expect(spyOnIsTokenExpired).toHaveBeenCalled()
    expect(request.headers.Authorization).toEqual('Bearer access_token')
})

test('isRouteCredentialNeeded true', () => {
    const options = {
        authorizationURL: 'someAuthorizationURL',
        tokenURL: '1234',
        clientID: 'clientID12',
        clientSecret: 'secret123',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'http://testUrl',
        callbackURL: 'http://localhost/callback',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
        routeCredential: {
            userName: 'username@email.com',
            password: 'password123',
            routes: ['route1'],
            scope: 'scope1 scope2',
        },
    }
    const isRouteCredentialsNeeded = oidc.isRouteCredentialNeeded('route1', options)
    expect(isRouteCredentialsNeeded).toBeTruthy()
})

test('isRouteCredentialNeeded false', () => {
    const options = {
        authorizationURL: 'someAuthorizationURL',
        tokenURL: '1234',
        clientID: 'clientID12',
        clientSecret: 'secret123',
        discoveryEndpoint: 'someEndpoint',
        issuerURL: 'issuer_url',
        logoutURL: 'http://testUrl',
        callbackURL: 'http://localhost/callback',
        responseTypes: ['none'],
        scope: 'some scope',
        sessionKey: 'key',
        tokenEndpointAuthMethod: 'client_secret_basic',
        useRoutes: false,
        routeCredential: {
            userName: 'username@email.com',
            password: 'password123',
            routes: ['route2'],
            scope: 'scope1 scope2',
        },
    }
    const isRouteCredentialsNeeded = oidc.isRouteCredentialNeeded('route1', options)
    expect(isRouteCredentialsNeeded).toBeFalsy()
})
