import { Request, Response } from 'express'
import * as otplib from 'otplib'
import { http } from '../../common/http'
import { s2s, S2SAuth } from './s2s.class'
import { S2S } from './s2s.constants'
import { S2SConfig } from './s2sConfig.interface'

const decodeMock = jest.fn(() => Buffer.from('1234567890'))

jest.mock('otplib', () => ({
    ScureBase32Plugin: jest.fn().mockImplementation(() => ({
        decode: decodeMock,
    })),
    createGuardrails: jest.fn((config) => config),
    generate: jest.fn(),
}))

describe('S2SAuth', () => {
    let s2sAuth: S2SAuth
    let post: jest.SpyInstance
    const s2sConfig = {
        microservice: 'rpx_xui',
        s2sEndpointUrl: 'http://s2s.local',
        s2sSecret: 'topSecret',
    } as S2SConfig
    const postS2SResponse = {
        data: 'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDAwMDAwMDB9.signature',
    }
    const oneTimePassword = 'password'
    beforeEach(() => {
        jest.clearAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
        post = jest.spyOn(http, 'post').mockResolvedValue(postS2SResponse as any)
        s2sAuth = new S2SAuth()
        s2sAuth.configure(s2sConfig, {})
        ;(otplib.generate as jest.MockedFunction<typeof otplib.generate>).mockResolvedValue(oneTimePassword)

        // Clear the S2S token cache of any existing token for the microservice
        s2sAuth.deleteCachedToken()
    })

    it('should be true that S2SAuth is defined', () => {
        expect(S2SAuth).toBeDefined()
    })

    it('should expose the expected S2S events', () => {
        expect(s2sAuth.getEvents()).toEqual(Object.values(S2S.EVENT))
    })

    it('should export a singleton S2SAuth instance', () => {
        expect(s2s).toBeInstanceOf(S2SAuth)
    })

    it('should generate an S2S token', async () => {
        const promise = s2sAuth.serviceTokenGenerator()
        const s2sToken = await promise
        expect(otplib.ScureBase32Plugin).toHaveBeenCalledTimes(1)
        expect(decodeMock).toHaveBeenCalledWith(s2sConfig.s2sSecret)
        expect(otplib.createGuardrails).toHaveBeenCalledWith({ MIN_SECRET_BYTES: 10 })
        expect(otplib.generate).toHaveBeenCalledWith(
            expect.objectContaining({
                guardrails: { MIN_SECRET_BYTES: 10 },
                secret: s2sConfig.s2sSecret,
                strategy: 'totp',
            })
        )
        expect(post).toHaveBeenCalledWith(`${s2sConfig.s2sEndpointUrl}`, {
            microservice: s2sConfig.microservice,
            oneTimePassword,
        })
        expect(s2sToken).toEqual(postS2SResponse.data)
    })

    it('should get a cached S2S token', async () => {
        let promise = s2sAuth.serviceTokenGenerator()
        let s2sToken = await promise

        promise = s2sAuth.serviceTokenGenerator()
        s2sToken = await promise
        expect(otplib.generate).toHaveBeenCalledTimes(1)
        expect(post).toHaveBeenCalledTimes(1)
        expect(s2sToken).toEqual(postS2SResponse.data)
    })

    it('should generate a new S2S token if the existing one has expired', async () => {
        const promise = s2sAuth.serviceTokenGenerator()
        await promise

        const cachedToken = s2sAuth.getToken()
        cachedToken.expiresAt = Math.floor(Date.now() / 1000)

        const promise2 = s2sAuth.serviceTokenGenerator()
        await promise2
        expect(otplib.generate).toHaveBeenCalledTimes(2)
        expect(post).toHaveBeenCalledTimes(2)
    })

    it('should delete the cached S2S token', async () => {
        const promise = s2sAuth.serviceTokenGenerator()
        await promise
        let cachedToken = s2sAuth.getToken()
        expect(cachedToken).toBeDefined()
        s2sAuth.deleteCachedToken()
        cachedToken = s2sAuth.getToken()
        expect(cachedToken).toBeUndefined()
    })

    it('should add an S2S token to the request headers and return next()', async () => {
        const req = {
            headers: {},
        } as Request
        const res = {} as Response
        const next = (): string => {
            return 'Dummy next function'
        }

        const promise = s2sAuth.s2sHandler(req, res, next)
        const result = await promise
        expect(req.headers).toEqual({ ServiceAuthorization: `Bearer ${postS2SResponse.data}` })
        expect(result).toEqual('Dummy next function')
    })

    it('should add an S2S token to the request headers and emit an event', async () => {
        const req = {
            headers: {},
        } as Request
        const res = {} as Response
        const next = (): string => {
            return 'Dummy next function'
        }

        s2sAuth.on(S2S.EVENT.AUTHENTICATE_SUCCESS, function (token, emittedReq, emittedRes, emittedNext) {
            expect(token).toEqual(postS2SResponse.data)
            expect(emittedReq).toEqual(req)
            expect(emittedRes).toEqual(res)
            expect(emittedNext).toEqual(next)
        })

        const promise = s2sAuth.s2sHandler(req, res, next)
        const result = await promise
        expect(req.headers).toEqual({ ServiceAuthorization: `Bearer ${postS2SResponse.data}` })
        expect(result).toBeUndefined()
    })

    it('should catch any error occurring and call next() with the error', async () => {
        const req = {
            headers: {},
        } as Request
        const res = {} as Response
        const next = jest.fn()

        const promise = s2sAuth.s2sHandler(req, res, next)
        post.mockRejectedValue(new Error('Failed to request S2S token'))

        const result = await promise
        expect(req.headers).toEqual({})
        expect(next).toHaveBeenCalledWith(Error('Failed to request S2S token'))
        expect(result).toBeUndefined()
    })

    it('should do nothing if no S2S token is returned or generated', async () => {
        const req = {
            headers: {},
        } as Request
        const res = {} as Response
        const next = jest.fn()

        const promise = s2sAuth.s2sHandler(req, res, next)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
        post.mockResolvedValue({ data: null } as any)

        const result = await promise
        expect(req.headers).toEqual({})
        expect(next).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
    })
})
