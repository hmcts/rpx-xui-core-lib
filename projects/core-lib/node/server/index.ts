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

export { XuiNode, xuiNode } from './common/models/xuiNode.class'
export type { XuiNodeOptions } from './common/models/xuiNodeOptions.interface'
export { getLogger, type XuiLogger } from './common/util/debug.logger'
