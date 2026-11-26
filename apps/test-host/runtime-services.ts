import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Idle } from '@ng-idle/core';
import { Keepalive } from '@ng-idle/keepalive';
import { Subject } from 'rxjs';
import { windowProvider, windowToken } from '@hmcts/rpx-xui-core-lib/browser/window';
import { GoogleAnalyticsService } from '@hmcts/rpx-xui-core-lib/ui/google-analytics';
import { GoogleTagManagerService } from '@hmcts/rpx-xui-core-lib/ui/google-tag-manager';
import { ManageSessionServices } from '@hmcts/rpx-xui-core-lib/ui/manage-session';

class BrowserIdleProbe {
  readonly onIdleEnd = new Subject<void>();
  readonly onTimeout = new Subject<void>();
  readonly onTimeoutWarning = new Subject<number>();
  readonly onIdleStart = new Subject<void>();
  idleName?: string;
  timeoutSeconds = 0;
  interruptSources: unknown[] = [];
  idleSeconds = 0;
  watchCount = 0;
  setIdleName(name?: string): void { this.idleName = name; }
  setTimeout(seconds: number): void { this.timeoutSeconds = seconds; }
  setInterrupts(sources: unknown[]): void { this.interruptSources = sources; }
  setIdle(seconds: number): void { this.idleSeconds = seconds; }
  watch(): void { this.watchCount += 1; }
}

class BrowserKeepaliveProbe {
  readonly onPing = new Subject<void>();
  intervalSeconds = 0;
  interval(seconds: number): void { this.intervalSeconds = seconds; }
}

@Component({ template: '<p>Case route loaded</p>' })
class RuntimeCasePage {}

@Component({
  selector: 'core-runtime-services-host',
  template: `<main>
    <h1>Runtime services diagnostic</h1>
    <button type="button" (click)="initializeAnalytics()">Initialize analytics</button>
    <button type="button" (click)="initializeSession()">Initialize session</button>
    <button type="button" (click)="navigate()">Navigate to case</button>
    <button type="button" (click)="warn()">Emit timeout warning</button>
    <button type="button" (click)="timeOut()">Emit session timeout</button>
    <output data-testid="analytics-ready">{{ analyticsReady }}</output>
    <output data-testid="session-events">{{ sessionEvents.join('|') }}</output>
  </main>`,
})
class RuntimeServicesGallery {
  analyticsReady = false;
  sessionEvents: string[] = [];

  constructor(
    private readonly analytics: GoogleAnalyticsService,
    private readonly tagManager: GoogleTagManagerService,
    private readonly session: ManageSessionServices,
    private readonly router: Router,
    private readonly idle: Idle,
  ) {}

  initializeAnalytics(): void {
    this.analytics.init('G-CORE-TEST');
    this.analytics.init('G-CORE-TEST');
    this.tagManager.init('GTM-CORE-TEST');
    this.tagManager.init('GTM-CORE-TEST');
    this.analyticsReady = true;
  }

  initializeSession(): void {
    this.session.appStateChanges().subscribe(event => this.sessionEvents.push(`${event.type}:${event.countdown ?? ''}`));
    this.session.init({ timeout: 60, idleMilliseconds: 120_000, keepAliveInSeconds: 300 });
  }

  navigate(): void {
    void this.router.navigateByUrl('/runtime-services/case/123');
  }

  warn(): void {
    this.idle.onTimeoutWarning.next(30);
  }

  timeOut(): void {
    this.idle.onTimeout.next(0);
  }
}

export function startRuntimeServicesGallery() {
  return bootstrapApplication(RuntimeServicesGallery, {
    providers: [
      provideRouter([
        { path: '', component: RuntimeCasePage },
        { path: 'runtime-services/case/:id', component: RuntimeCasePage },
      ]),
      { provide: windowToken, useFactory: windowProvider },
      { provide: Idle, useClass: BrowserIdleProbe },
      { provide: Keepalive, useClass: BrowserKeepaliveProbe },
    ],
  });
}
