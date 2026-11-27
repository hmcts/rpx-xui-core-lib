import express, { Router } from 'express'
import session from 'express-session'
import * as http from 'node:http'
import { XuiLogger } from '../../common/util/debug.logger'
import { Strategy } from './strategy.class'

class TestStrategy extends Strategy {
    constructor() {
        super('csrf-test', Router(), {
            log: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(),
        } as unknown as XuiLogger)
    }
}

test('CSRF middleware rejects cookie and query tokens and accepts the issued token in a header or body', async () => {
    const strategy = new TestStrategy()
    strategy.initialiseCSRF()
    const router = (strategy as unknown as { router: Router }).router
    const app = express()
    app.use(session({ secret: 'synthetic-test-session-secret', resave: false, saveUninitialized: true }))
    app.use(express.json())
    app.use(router)
    app.get('/csrf-token', (req, res) => res.json({ token: req.csrfToken() }))
    app.post('/mutation', (_req, res) => res.status(204).end())
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

    try {
        const origin = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`
        const tokenResponse = await fetch(`${origin}/csrf-token`)
        const token = (await tokenResponse.json() as { token: string }).token
        const cookies = tokenResponse.headers.getSetCookie().map((value) => value.split(';', 1)[0])
        const cookieHeader = cookies.join('; ')

        const cookieOnly = await fetch(`${origin}/mutation`, { method: 'POST', headers: { cookie: cookieHeader } })
        expect(cookieOnly.status).toBe(403)

        const queryOnly = await fetch(`${origin}/mutation?_csrf=${encodeURIComponent(token)}`, {
            method: 'POST', headers: { cookie: cookieHeader },
        })
        expect(queryOnly.status).toBe(403)

        const headerToken = await fetch(`${origin}/mutation`, {
            method: 'POST', headers: { cookie: cookieHeader, 'x-xsrf-token': token },
        })
        expect(headerToken.status).toBe(204)

        const bodyToken = await fetch(`${origin}/mutation`, {
            method: 'POST',
            headers: { cookie: cookieHeader, 'content-type': 'application/json' },
            body: JSON.stringify({ _csrf: token }),
        })
        expect(bodyToken.status).toBe(204)
    } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
})
