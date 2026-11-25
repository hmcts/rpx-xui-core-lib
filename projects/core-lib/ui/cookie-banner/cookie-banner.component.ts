import { Component, DOCUMENT, EventEmitter, Inject, Input, Output } from '@angular/core';
import { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie';

interface DynatraceRum {
  enable(): void;
  enableSessionReplay(enabled: boolean): void;
}

type CookieBannerWindow = Window & { dtrum?: DynatraceRum };

@Component({
  selector: 'xuilib-cookie-banner',
  templateUrl: './cookie-banner.component.html',
  standalone: false,
})
export class CookieBannerComponent {
  @Input() public identifier!: string;
  @Input() public appName!: string;
  @Input() public enableDynatrace = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the legacy output type until consumers migrate.
  @Output() public rejectionNotifier = new EventEmitter<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the legacy output type until consumers migrate.
  @Output() public acceptanceNotifier = new EventEmitter<any>();

  public isCookieBannerVisible = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve CommonLib's published component property type.
  public readonly window: any;

  constructor(
    private readonly cookieService: CookieService,
    @Inject(DOCUMENT) document: Document,
  ) {
    this.window = document.defaultView as CookieBannerWindow | null;
  }

  public ngOnInit(): void {
    this.setState();
  }

  public acceptCookie(): void {
    this.cookieService.setCookie(this.identifier, 'true', this.getExpiryDate());
    this.setState(true);
  }

  public rejectCookie(): void {
    this.cookieService.setCookie(this.identifier, 'false', this.getExpiryDate());
    this.setState(true);
  }

  public setState(reload = false): void {
    this.isCookieBannerVisible = !this.cookieService.checkCookie(this.identifier);

    if (this.areCookiesAccepted()) {
      this.notifyAcceptance();
    } else {
      this.notifyRejection();
    }

    if (reload && this.window) {
      this.window.location.reload();
    }
  }

  public areCookiesAccepted(): boolean {
    return this.cookieService.checkCookie(this.identifier) && this.cookieService.getCookie(this.identifier) === 'true';
  }

  public notifyRejection(): void {
    this.rejectionNotifier.emit();
  }

  public notifyAcceptance(): void {
    if (this.enableDynatrace) {
      if (this.window && Object.prototype.hasOwnProperty.call(this.window, 'dtrum')) {
        const dtrum = this.window.dtrum;
        if (dtrum) {
          try {
            dtrum.enable();
            dtrum.enableSessionReplay(true);
          } catch (error) {
            console.error('Error enabling DynaTrace', error);
          }
        } else {
          console.info('DynaTrace not enabled on the server');
        }
      } else {
        console.info('DynaTrace not enabled on the server');
      }
    } else {
      console.info('Dyntrace RUM not enabled via component parameter');
    }
    this.acceptanceNotifier.emit();
  }

  private getExpiryDate(): string {
    const expiry = new Date();
    expiry.setTime(expiry.getTime() + 31536000000);
    return expiry.toUTCString();
  }
}
