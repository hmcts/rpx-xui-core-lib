import type { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie';
import type { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';

declare global {
  interface Window {
    genericFilterFixture: () => { form: Record<string, unknown>; submitted: boolean };
    lookupHarness: { counts(): number[]; taskOptions(): unknown[]; answerTask(index: number, label: string): void; emptyTask(index: number): void; malformedTask(index: number): void; failTask(index: number): void; answerWork(index: number, label: string): void; failWork(index: number): void };
    reuseProbe: { requestCount(): number };
    personHarness: { count(): number; answer(index: number, people: import('@hmcts/rpx-xui-core-lib/ui/find-person').Person[]): void };
    cookieProbe: CookieService;
    sessionStorageProbe: SessionStorageService;
    windowProbe: unknown;
  }
}
