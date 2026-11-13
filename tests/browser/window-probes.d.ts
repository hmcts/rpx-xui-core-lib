import type { FilterService } from '@hmcts/rpx-xui-core-lib/ui/filter-state';
import type { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie';
import type { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';

declare global {
  interface Window {
    lookupHarness: { counts(): number[]; taskOptions(): unknown[]; answerTask(index: number, label: string): void; emptyTask(index: number): void; malformedTask(index: number): void; failTask(index: number): void; answerWork(index: number, label: string): void; failWork(index: number): void };
    reuseProbe: { requestCount(): number };
    personHarness: { count(): number; answer(index: number, people: import('@hmcts/rpx-xui-core-lib/ui/find-person').Person[]): void };
    filterProbe: FilterService;
    cookieProbe: CookieService;
    sessionStorageProbe: SessionStorageService;
    windowProbe: unknown;
  }
}
