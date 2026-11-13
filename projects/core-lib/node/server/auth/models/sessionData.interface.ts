import { Cookie, Session } from 'express-session'

export interface MySessionData extends Session {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    [key: string]: any
    cookie: Cookie
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    passport: any
}
