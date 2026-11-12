import type { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie';
import type { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';

declare global {
  interface Window {
    cookieProbe: CookieService;
    sessionStorageProbe: SessionStorageService;
    windowProbe: unknown;
  }
}
