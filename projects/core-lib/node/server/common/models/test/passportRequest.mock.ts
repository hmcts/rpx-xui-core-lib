import { Request } from 'express'
import { createMock } from '@golevelup/ts-jest'

export interface PassportRequest extends Request {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    user?: any;
    isAuthenticated(): this is AuthenticatedRequest;
    isUnauthenticated(): this is UnauthenticatedRequest;
}

interface AuthenticatedRequest extends Request {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    user: any;
}

interface UnauthenticatedRequest extends Request {
    user?: undefined;
}

export function createMockPassportRequest(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    user?: any,
    overrides: Partial<PassportRequest> = {}
): PassportRequest {
    const req = createMock<Request>() as unknown as PassportRequest

    req.user = user ?? undefined
    req.isAuthenticated = function (): this is AuthenticatedRequest {
        return !!this.user
    }
    req.isUnauthenticated = function (): this is UnauthenticatedRequest {
        return !this.user
    }

    Object.assign(req, overrides)
    return req
}
