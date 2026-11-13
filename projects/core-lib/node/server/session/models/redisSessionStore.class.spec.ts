import { RedisSessionStore } from './redisSessionStore.class'
import { createMock } from '@golevelup/ts-jest';
import { RedisSessionMetadata, SessionMetadata } from './sessionMetadata.interface'
import * as redis from 'redis'
import { RedisClientType } from 'redis'
import { Router } from 'express'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import { SESSION } from '../session.constants'
import { XuiLogger } from '../../common/util/debug.logger'

describe('getStore()', () => {
    const flushPromises = () => new Promise(process.nextTick)

    it('should create and connect the redis client with the redisCloudUrl.', () => {
        const MOCK_REDIS_CLOUD_URL = 'redis://i.am.a.redis.cloud.url'
        const MOCK_REDIS_KEY_PREFIX = 'mockRedisKeyPrefix'
        const MOCK_REDIS_TTL = 123

        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions.redisCloudUrl = MOCK_REDIS_CLOUD_URL
        redisSessionMetadata.redisStoreOptions.redisKeyPrefix = MOCK_REDIS_KEY_PREFIX
        redisSessionMetadata.redisStoreOptions.redisTtl = MOCK_REDIS_TTL

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        const spyOnRedisCreateClient = jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)
        const mockRouter = createMock<Router>()
        const redisSessionStore = new RedisSessionStore(mockRouter)
        const store = redisSessionStore.getStore(redisSessionMetadata)

        expect(spyOnRedisCreateClient).toHaveBeenCalledWith({ url: MOCK_REDIS_CLOUD_URL })
        expect(mockRedisStore.connect).toHaveBeenCalled()
        expect(store.prefix).toEqual(MOCK_REDIS_KEY_PREFIX)
        expect(store.ttl).toEqual(MOCK_REDIS_TTL)
    })

    it('should normalize legacy tls query URLs to rediss for redis v6.', () => {
        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: 'redis://:secret@i.am.a.redis.cloud.url:6380?tls=true',
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: 123,
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        const spyOnRedisCreateClient = jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)

        const redisSessionStore = new RedisSessionStore(createMock<Router>())
        redisSessionStore.getStore(redisSessionMetadata)

        expect(spyOnRedisCreateClient).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringMatching(/^rediss:\/\//),
            }),
        )
    })

    it('should convert username-only URL credentials to password auth.', () => {
        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: 'redis://access-key@i.am.a.redis.cloud.url:6380?tls=true',
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: 123,
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        const spyOnRedisCreateClient = jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)

        const redisSessionStore = new RedisSessionStore(createMock<Router>())
        redisSessionStore.getStore(redisSessionMetadata)

        expect(spyOnRedisCreateClient).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringMatching(/^rediss:\/\/:access-key@i\.am\.a\.redis\.cloud\.url:6380\/?$/),
            }),
        )
    })

    it('should keep rediss URLs unchanged.', () => {
        const REDISS_URL = 'rediss://:secret@i.am.a.redis.cloud.url:6380'
        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: REDISS_URL,
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: 123,
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        const spyOnRedisCreateClient = jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)

        const redisSessionStore = new RedisSessionStore(createMock<Router>())
        redisSessionStore.getStore(redisSessionMetadata)

        expect(spyOnRedisCreateClient).toHaveBeenCalledWith({ url: REDISS_URL })
    })

    it('should parse legacy Azure redis connection strings.', () => {
        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: 'xui-redis.redis.cache.windows.net:6380,password=secret,ssl=true,abortConnect=false',
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: 123,
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        const spyOnRedisCreateClient = jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)

        const redisSessionStore = new RedisSessionStore(createMock<Router>())
        redisSessionStore.getStore(redisSessionMetadata)

        expect(spyOnRedisCreateClient).toHaveBeenCalledWith({
            socket: {
                host: 'xui-redis.redis.cache.windows.net',
                port: 6380,
                tls: true,
            },
            username: 'default',
            password: 'secret',
        })
    })

    it('should use provided username from legacy Azure redis connection strings.', () => {
        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: 'xui-redis.redis.cache.windows.net:6380,user=my-user,password=secret,ssl=true',
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: 123,
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        const spyOnRedisCreateClient = jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)

        const redisSessionStore = new RedisSessionStore(createMock<Router>())
        redisSessionStore.getStore(redisSessionMetadata)

        expect(spyOnRedisCreateClient).toHaveBeenCalledWith({
            socket: {
                host: 'xui-redis.redis.cache.windows.net',
                port: 6380,
                tls: true,
            },
            username: 'my-user',
            password: 'secret',
        })
    })

    it('should leave ttl undefined when redisTtl is not configured.', () => {
        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: 'redis://i.am.a.redis.cloud.url',
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: undefined as unknown as RedisSessionMetadata['redisStoreOptions']['redisTtl'],
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)
        const redisSessionStore = new RedisSessionStore(createMock<Router>())
        const store = redisSessionStore.getStore(redisSessionMetadata)

        expect(store.ttl).toEqual(86400)
    })

    it('should leave ttl undefined when redisTtl is invalid.', () => {
        const redisSessionMetadata = createMock<RedisSessionMetadata>()

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: 'redis://i.am.a.redis.cloud.url',
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: 'not-a-number',
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockResolvedValue(undefined),
        })
        jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)
        const redisSessionStore = new RedisSessionStore(createMock<Router>())
        const store = redisSessionStore.getStore(redisSessionMetadata)

        expect(store.ttl).toEqual(86400)
    })

    it('should log and emit redis client errors when connect rejects.', async () => {
        const redisSessionMetadata = createMock<RedisSessionMetadata>()
        const error = new Error('Unable to connect to redis; password=synthetic-redis-password')

        redisSessionMetadata.redisStoreOptions = {
            redisCloudUrl: 'redis://i.am.a.redis.cloud.url',
            redisKeyPrefix: 'mockRedisKeyPrefix',
            redisTtl: 123,
        }

        const mockRedisStore = createMock<RedisClientType>({
            connect: jest.fn().mockRejectedValue(error),
        })
        jest
            .spyOn(redis, 'createClient')
            .mockReturnValue(mockRedisStore as unknown as ReturnType<typeof redis.createClient>)

        const logger = createMock<XuiLogger>()
        const redisSessionStore = new RedisSessionStore(createMock<Router>(), logger)
        const spyEmitEvent = jest.spyOn(redisSessionStore, 'emitEvent')

        redisSessionStore.getStore(redisSessionMetadata)
        await flushPromises()

        expect(logger.error).toHaveBeenCalledWith('redis client connection error', 'Error')
        expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain('synthetic-redis-password')
        expect(spyEmitEvent).toHaveBeenCalledWith(SESSION.EVENT.REDIS_CLIENT_ERROR, error)
    })

    describe('Redis client event listeners', () => {
        let redisClient: RedisClientType
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
        let spyOnRedisClientOnEvent: any

        beforeEach(() => {
            const REDIS_CLIENT_LISTENER = 'on'

            redisClient = createMock<RedisClientType>()

            spyOnRedisClientOnEvent = jest.spyOn(redisClient, REDIS_CLIENT_LISTENER)
        })

        it("should listen for redisClient on 'ready' event.", () => {
            const REDIS_CLIENT_READY_EVENT = 'ready'

            const mockRouter = createMock<Router>()
            const redisSessionStore = new RedisSessionStore(mockRouter)
            redisSessionStore.redisClientReadyListener(redisClient)

            expect(spyOnRedisClientOnEvent).toHaveBeenCalledWith(REDIS_CLIENT_READY_EVENT, expect.any(Function))
        })

        it("should emit and log when redisClient receives the 'ready' event.", () => {
            const mockRouter = createMock<Router>()
            const logger = createMock<XuiLogger>()
            const redisSessionStore = new RedisSessionStore(mockRouter, logger)
            const spyEmitEvent = jest.spyOn(redisSessionStore, 'emitEvent')

            redisSessionStore.redisClientReadyListener(redisClient)
            const readyListener = spyOnRedisClientOnEvent.mock.calls[0][1]
            readyListener()

            expect(spyEmitEvent).toHaveBeenCalledWith(SESSION.EVENT.REDIS_CLIENT_READY, redisClient)
            expect(logger.info).toHaveBeenCalledWith('redis client connected successfully')
            expect(logger.info).toHaveBeenCalledTimes(1)
        })

        it("should listen for redisClient on 'error' event.", () => {
            const REDIS_CLIENT_ERROR_EVENT = 'error'
            const mockRouter = createMock<Router>()
            const redisSessionStore = new RedisSessionStore(mockRouter)
            redisSessionStore.redisClientErrorListener(redisClient)

            expect(spyOnRedisClientOnEvent).toHaveBeenCalledWith(REDIS_CLIENT_ERROR_EVENT, expect.any(Function))
        })

        it("should log and emit when redisClient receives the 'error' event.", () => {
            const error = new Error('Redis client failed; password=synthetic-redis-password')
            const mockRouter = createMock<Router>()
            const logger = createMock<XuiLogger>()
            const redisSessionStore = new RedisSessionStore(mockRouter, logger)
            const spyEmitEvent = jest.spyOn(redisSessionStore, 'emitEvent')

            redisSessionStore.redisClientErrorListener(redisClient)
            const errorListener = spyOnRedisClientOnEvent.mock.calls[0][1]
            errorListener(error)

            expect(logger.error).toHaveBeenCalledWith('redis client emitted an error', 'Error')
            expect(logger.error).not.toHaveBeenCalledWith(error)
            expect(logger.info).not.toHaveBeenCalledWith('redisClient is ', redisClient)
            expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain('synthetic-redis-password')
            expect(spyEmitEvent).toHaveBeenCalledWith(SESSION.EVENT.REDIS_CLIENT_ERROR, error)
        })
    })
})

test('sessionStore configure', () => {
    const mockRouter = createMock<Router>()
    const spyUse = jest.spyOn(mockRouter, 'use')
    const sessionStore = new RedisSessionStore(mockRouter)
    const options: SessionMetadata = {
        cookie: { httpOnly: true, secure: false, maxAge: 60_000 },
        name: 'core.sid', secret: 'synthetic-local-session-secret', resave: false, saveUninitialized: false,
    }
    const store = new session.MemoryStore()
    const spyClassStore = jest.spyOn(sessionStore, 'getClassStore').mockReturnValue(store)
    const spySessionOptions = jest.spyOn(sessionStore, 'mapSessionOptions')

    expect(sessionStore.configure(options)).toBe(mockRouter)

    expect(spyClassStore).toHaveBeenCalledWith(options)
    expect(spySessionOptions).toHaveBeenCalledWith(options, store)
    expect(spySessionOptions).toHaveReturnedWith({ ...options, store })
    expect(spyUse).toHaveBeenCalledTimes(1)
    expect(spyUse).toHaveBeenCalledWith(expect.any(Function))
})

test('sessionStore getClassStore error', () => {
    const mockRouter = createMock<Router>()
    const sessionStore = new RedisSessionStore(mockRouter)
    expect(() => {
        sessionStore.getClassStore(null as unknown as SessionMetadata)
    }).toThrow('Store Options are missing')
})

test('sessionStore getClassStore', () => {
    const storeMock = createMock<RedisStore>()
    const mockSessionMetadata = createMock<SessionMetadata>()
    const mockRouter = createMock<Router>()
    const sessionStore = new RedisSessionStore(mockRouter)
    const spyGetStore = jest.spyOn(sessionStore, 'getStore').mockReturnValue(storeMock)
    sessionStore.getClassStore(mockSessionMetadata)
    expect(spyGetStore).toHaveBeenCalled()
})

test('sessionStore mapSessionOptions', () => {
    const options = {
        cookie: {
            httpOnly: false,
            maxAge: 123,
            secure: false,
        },
        name: 'name',
        resave: false,
        saveUninitialized: true,
        secret: 'secret',
    }
    const mockStore = createMock<session.Store>()
    const mockRouter = createMock<Router>()
    const redisSessionStore = new RedisSessionStore(mockRouter)
    const result = redisSessionStore.mapSessionOptions(options, mockStore)

    expect(result.cookie).toEqual(options.cookie)
    expect(result.name).toEqual(options.name)
    expect(result.resave).toEqual(options.resave)
    expect(result.saveUninitialized).toEqual(options.saveUninitialized)
    expect(result.secret).toEqual(options.secret)
    expect(result.store).toEqual(mockStore)
})

test('emitEvent with no subscribers', () => {
    const mockRouter = createMock<Router>()
    const redisSessionStore = new RedisSessionStore(mockRouter)

    const spyEmit = jest.spyOn(redisSessionStore, 'emit')
    const spy = jest.spyOn(redisSessionStore, 'listenerCount').mockReturnValue(0)
    redisSessionStore.emitEvent('eventName', {})
    expect(spy).toHaveBeenCalled()
    expect(spyEmit).not.toHaveBeenCalled()
})

test('emitEvent with subscribers', () => {
    const mockRouter = createMock<Router>()
    const redisSessionStore = new RedisSessionStore(mockRouter)

    const spyEmit = jest.spyOn(redisSessionStore, 'emit')
    const spy = jest.spyOn(redisSessionStore, 'listenerCount').mockReturnValue(1)
    redisSessionStore.emitEvent('eventName', {})
    expect(spy).toHaveBeenCalled()
    expect(spyEmit).toHaveBeenCalled()
})

test('emitEvent notifies error subscribers without requiring a ready subscriber', () => {
    const redisSessionStore = new RedisSessionStore(createMock<Router>())
    const error = new Error('Redis client failed')
    const onError = jest.fn()

    redisSessionStore.on(SESSION.EVENT.REDIS_CLIENT_ERROR, onError)
    redisSessionStore.emitEvent(SESSION.EVENT.REDIS_CLIENT_ERROR, error)

    expect(onError).toHaveBeenCalledWith(error)
})

test('emitEvent ignores errors when only ready subscribers exist', () => {
    const redisSessionStore = new RedisSessionStore(createMock<Router>())
    const onReady = jest.fn()
    const emit = jest.spyOn(redisSessionStore, 'emit')

    redisSessionStore.on(SESSION.EVENT.REDIS_CLIENT_READY, onReady)
    redisSessionStore.emitEvent(SESSION.EVENT.REDIS_CLIENT_ERROR, new Error('Redis client failed'))

    expect(onReady).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
})
