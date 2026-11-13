import debug from 'debug'
import { getLogger } from './debug.logger'

let namespaces: string
let debugSetting: string | undefined

beforeEach(() => {
    debugSetting = process.env.DEBUG
    namespaces = debug.disable()
})

afterEach(() => {
    debug.enable(namespaces)
    if (debugSetting === undefined) delete process.env.DEBUG
    else process.env.DEBUG = debugSetting
})

test('logger keeps shared suffixes isolated by their complete namespaces', () => {
    const first = getLogger('one:shared').log as debug.Debugger
    const second = getLogger('two:shared').log as debug.Debugger
    expect(first.namespace).toBe('xuiNode:one:shared')
    expect(second.namespace).toBe('xuiNode:two:shared')
    expect(first).not.toBe(second)
    expect(first.color).not.toBe(second.color)
})

test('logger namespace filters cannot enable another prefix with the same suffix', () => {
    debug.enable('xuiNode:allowed:filtered-shared')
    const allowed = getLogger('allowed:filtered-shared').log as debug.Debugger
    const suppressed = getLogger('suppressed:filtered-shared').log as debug.Debugger
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined)
    expect(allowed.enabled).toBe(true)
    expect(suppressed.enabled).toBe(false)
    allowed('allowed-message')
    suppressed('suppressed-message')
    expect(info).toHaveBeenCalledTimes(1)
    expect(info.mock.calls.flat().join(' ')).toContain('allowed-message')
    expect(info.mock.calls.flat().join(' ')).not.toContain('suppressed-message')
})

test('logger reuses the same emitted namespace and color across custom delimiters', () => {
    const logger = getLogger('cached|leaf', '|').log as debug.Debugger
    expect(logger.namespace).toBe('xuiNode:cached:leaf')
    expect(getLogger('cached|leaf', '|').log).toBe(logger)
    expect(getLogger('cached:leaf').log).toBe(logger)
    expect(getLogger('cached:leaf', '|').log).toBe(logger)
    expect((getLogger('cached:leaf').log as debug.Debugger).color).toBe(logger.color)
})

test('logger resolves console instrumentation installed after its creation', () => {
    const logger = getLogger('instrumentation:late')
    debug.enable('xuiNode:instrumentation:late')
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined)
    expect(logger.info).toBe(logger.log)
    expect(logger.warn).toBe(logger.log)
    expect(logger.error).toBe(logger.log)
    logger.info('late-console-hook')
    expect(info).toHaveBeenCalledTimes(1)
    expect(info.mock.calls.flat().join(' ')).toContain('late-console-hook')
})
