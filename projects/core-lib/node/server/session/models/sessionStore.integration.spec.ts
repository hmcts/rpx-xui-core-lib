import express, { type NextFunction, type Request, type Response, Router } from 'express'
import session from 'express-session'
import * as http from 'node:http'
import { SessionStore } from './sessionStore.class'
import type { SessionMetadata } from './sessionMetadata.interface'

class LocalSessionStore extends SessionStore {
  constructor(private readonly memory: session.MemoryStore) {
    super('local-test-memory', Router())
  }

  public getStore(): session.Store {
    return this.memory
  }
}

async function fixture(cookie: Partial<SessionMetadata['cookie']> = {}) {
  const store = new session.MemoryStore()
  const middleware = new LocalSessionStore(store)
  const options: SessionMetadata = {
    cookie: { httpOnly: true, secure: false, maxAge: 60_000, ...cookie },
    name: 'core.sid', secret: 'synthetic-local-session-secret', resave: false, saveUninitialized: false,
  }
  const errors: Error[] = []
  const counter = jest.fn((req: Request, res: Response) => {
    const state = req.session as session.Session & session.SessionData & { counter?: number }
    state.counter = (state.counter ?? 0) + 1
    res.json({ counter: state.counter })
  })
  const app = express()
  app.set('trust proxy', 1)
  app.use(middleware.configure(options))
  app.get('/empty', (_req, res) => res.status(204).end())
  app.get('/counter', counter)
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    void _next
    errors.push(error)
    res.status(503).send('Session unavailable')
  })
  const server = http.createServer(app)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve() })
  })
  const port = (server.address() as import('node:net').AddressInfo).port
  return {
    store, errors, counter,
    request: (path: string, headers?: Record<string, string>) => fetch(`http://127.0.0.1:${port}${path}`, { headers, signal: AbortSignal.timeout(2000) }),
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
      server.closeAllConnections()
    }),
  }
}

function cookieParts(response: globalThis.Response) {
  const [cookie = '', ...attributes] = (response.headers.getSetCookie()[0] ?? '').split(';').map(part => part.trim())
  return { cookie, attributes }
}

test('session middleware persists signed sessions, isolates clients and leaves untouched sessions unsaved', async () => {
  const app = await fixture()
  try {
    const empty = await app.request('/empty')
    expect(empty.status).toBe(204)
    expect(empty.headers.getSetCookie().length).toBe(0)
    const first = await app.request('/counter')
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ counter: 1 })
    const { cookie, attributes } = cookieParts(first)
    expect(cookie.startsWith('core.sid=')).toBe(true)
    expect(attributes.some(value => /^httponly$/i.test(value))).toBe(true)
    expect(attributes.some(value => /^expires=/i.test(value))).toBe(true)
    expect(attributes.some(value => /^secure$/i.test(value))).toBe(false)
    const reused = await app.request('/counter', { Cookie: cookie })
    expect(await reused.json()).toEqual({ counter: 2 })
    const fresh = await app.request('/counter')
    expect(await fresh.json()).toEqual({ counter: 1 })
    expect(cookieParts(fresh).cookie !== cookie).toBe(true)
    const tampered = await app.request('/counter', { Cookie: `${cookie}invalid` })
    expect(await tampered.json()).toEqual({ counter: 1 })
    const original = await app.request('/counter', { Cookie: cookie })
    expect(await original.json()).toEqual({ counter: 3 })
    expect(app.errors).toHaveLength(0)
  } finally { await app.close() }
})

test('secure session cookies require the configured trusted HTTPS transport', async () => {
  const app = await fixture({ secure: true })
  try {
    const plain = await app.request('/counter')
    expect(plain.status).toBe(200)
    await plain.json()
    expect(plain.headers.getSetCookie().length).toBe(0)
    const trustedHttps = await app.request('/counter', { 'X-Forwarded-Proto': 'https' })
    expect(trustedHttps.status).toBe(200)
    await trustedHttps.json()
    const { cookie, attributes } = cookieParts(trustedHttps)
    expect(cookie.startsWith('core.sid=')).toBe(true)
    expect(attributes.some(value => /^secure$/i.test(value))).toBe(true)
    expect(attributes.some(value => /^httponly$/i.test(value))).toBe(true)
    expect(app.errors).toHaveLength(0)
  } finally { await app.close() }
})

test('session store read failures reach the error handler without running the protected route', async () => {
  const app = await fixture()
  try {
    const initial = await app.request('/counter')
    expect(initial.status).toBe(200)
    await initial.json()
    const { cookie } = cookieParts(initial)
    expect(cookie.startsWith('core.sid=')).toBe(true)
    const failure = new Error('synthetic local store failure')
    const read = jest.spyOn(app.store, 'get').mockImplementation((_sid, callback) => callback(failure))
    const response = await app.request('/counter', { Cookie: cookie })
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('Session unavailable')
    expect(read).toHaveBeenCalledTimes(1)
    expect(app.counter).toHaveBeenCalledTimes(1)
    expect(app.errors).toEqual([failure])
  } finally { await app.close() }
})
