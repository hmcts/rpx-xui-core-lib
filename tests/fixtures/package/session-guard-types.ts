import { InjectionToken } from '@angular/core';
import { CanActivate } from '@angular/router';
import {
  SessionErrorRoute,
  SessionJsonErrorLogger as SessionJsonErrorLoggerToken,
  SessionStorageGuard
} from '@hmcts/rpx-xui-core-lib/case/session-guard';
import type { SessionJsonErrorLogger } from '@hmcts/rpx-xui-core-lib/case/session-guard';

const guard: CanActivate = new SessionStorageGuard({ getItem: () => null } as never, { navigate: () => Promise.resolve(true) } as never);
const route: InjectionToken<string> = SessionErrorRoute;
const errorLogger: InjectionToken<SessionJsonErrorLogger> = SessionJsonErrorLoggerToken;
void guard;
void route;
void errorLogger;
