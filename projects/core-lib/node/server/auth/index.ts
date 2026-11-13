/// <reference types="express-serve-static-core" />
/// <reference types="express-session" />

declare module 'express-serve-static-core' {
  interface Request {
    isRefresh?: boolean
  }
}

declare module 'express-session' {
  interface Session {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Passport stores the Node Lib consumer-defined serialized user shape.
    passport: any
  }
}

export * from './oidc'
export * from './oauth2'
export * from './s2s'
export * from './auth.constants'
export * from './models'
