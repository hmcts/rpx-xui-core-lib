import 'express-session'
import 'express-serve-static-core'
import type { CookieSerializeOptions } from 'cookie'

declare module 'express-session' {
    interface Session {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Passport stores the Node Lib consumer-defined serialized user shape.
        passport: any
    }
}

declare module 'express-serve-static-core' {
    interface Request {
        isRefresh?: boolean
    }
}

declare module 'cookie' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- This compatibility interface aliases cookie v2's serialization options for its declaration consumer.
    interface SerializeOptions extends CookieSerializeOptions {}
}
