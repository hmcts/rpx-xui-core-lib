import debug from 'debug'

export interface XuiLogger {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    log: (...args: any[]) => any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    info: (...args: any[]) => any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    warn: (...args: any[]) => any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    error: (...args: any[]) => any
}

const cache: Map<string, debug.Debugger> = new Map<string, debug.Debugger>()

let color = 1

export const getLogger = (namespace: string, delimiter = ':'): XuiLogger => {
    let logger: debug.Debugger = debug('xuiNode')
    namespace.split(delimiter).forEach((newNamespace: string) => {
        const qualifiedNamespace = `${logger.namespace}:${newNamespace}`
        if (!cache.has(qualifiedNamespace)) {
            const newLogger = logger.extend(newNamespace)
            newLogger.color = String(color)
            cache.set(qualifiedNamespace, newLogger)
            color += 1
        }
        logger = cache.get(qualifiedNamespace) as debug.Debugger
    })
    // Resolve console.info at write time so instrumentation added after logger
    // creation, such as Application Insights console patching, still sees logs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    logger.log = (...args: any[]) => console.info(...args)
    return {
        log: logger,
        warn: logger,
        error: logger,
        info: logger,
    }
}
