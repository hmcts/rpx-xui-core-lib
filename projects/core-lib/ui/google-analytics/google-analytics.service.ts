import { DOCUMENT, Inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window';

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  public googleAnalyticsKey: string;
  private readonly analyticsWindow: AnalyticsWindow;
  private readonly document: Document;
  private routeSubscription?: Subscription;
  private script?: HTMLScriptElement;
  private initialized = false;

  constructor(
    private readonly router: Router,
    private readonly title: Title,
    @Inject(windowToken) window: Window,
    @Inject(DOCUMENT) document: Document
  ) {
    this.analyticsWindow = window as AnalyticsWindow;
    this.document = document;
  }

  public init(googleAnalyticsKey: string): void {
    if (this.script) return;
    if (this.initialized && this.googleAnalyticsKey !== googleAnalyticsKey) return;

    this.googleAnalyticsKey = googleAnalyticsKey;
    if (!this.initialized) {
      const dataLayer = this.analyticsWindow.dataLayer ??= [];
      if (typeof this.analyticsWindow.gtag !== 'function') {
        this.analyticsWindow.gtag = (...args: unknown[]) => dataLayer.push(args);
      }

      this.analyticsWindow.gtag('js', new Date());
      this.analyticsWindow.gtag('config', googleAnalyticsKey, { send_page_view: false });
      this.initialized = true;
    }

    try {
      const script = this.document.createElement('script');
      script.async = true;
      const scriptUrl = new URL('https://www.googletagmanager.com/gtag/js');
      scriptUrl.searchParams.set('id', googleAnalyticsKey);
      script.src = scriptUrl.toString();
      this.document.head.appendChild(script);
      this.script = script;
    } catch (error) {
      console.error('Error appending google analytics');
      console.error(error);
    }

    this.listenForRouteChanges();
  }

  public event(eventName: string, params: Record<string, unknown>): void {
    if (typeof this.analyticsWindow.gtag === 'function') {
      this.analyticsWindow.gtag('event', eventName, params);
    } else {
      console.warn('Google Analytics is not available.');
    }
  }

  private listenForRouteChanges(): void {
    if (!this.googleAnalyticsKey || this.routeSubscription) return;
    this.routeSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && typeof this.analyticsWindow.gtag === 'function') {
        this.analyticsWindow.gtag('config', this.googleAnalyticsKey, {
          page_path: event.urlAfterRedirects,
          page_title: this.title.getTitle()
        });
      }
    });
  }
}
