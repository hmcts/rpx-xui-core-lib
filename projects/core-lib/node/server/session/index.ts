/// <reference types="express-session" />

declare module 'express-session' {
  interface Session {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Passport stores the Node Lib consumer-defined serialized user shape.
    passport: any
  }
}

export * from './models'
export * from './session.constants'
