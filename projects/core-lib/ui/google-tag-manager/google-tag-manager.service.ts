import { DOCUMENT, Inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window';

interface TagManagerWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>;
}

@Injectable({ providedIn: 'root' })
export class GoogleTagManagerService {
  public googleTagManagerKey: string;
  private readonly tagManagerWindow: TagManagerWindow;
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
    this.tagManagerWindow = window as TagManagerWindow;
    this.document = document;
  }

  public init(googleTagManagerKey: string): void {
    if (this.script) return;
    if (this.initialized && this.googleTagManagerKey !== googleTagManagerKey) return;

    this.googleTagManagerKey = googleTagManagerKey;
    if (!this.initialized) {
      const dataLayer = this.tagManagerWindow.dataLayer ??= [];
      dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      this.initialized = true;
    }

    try {
      const script = this.document.createElement('script');
      script.async = true;
      const scriptUrl = new URL('https://www.googletagmanager.com/gtm.js');
      scriptUrl.searchParams.set('id', googleTagManagerKey);
      script.src = scriptUrl.toString();
      this.document.head.appendChild(script);
      this.script = script;
    } catch (error) {
      console.error('Error appending google tag manager');
      console.error(error);
    }

    this.listenForRouteChanges();
  }

  public virtualPageView(eventName: string, path: string, title: string, metadata?: Record<string, unknown>): void {
    if (!this.tagManagerWindow.dataLayer) return;
    this.tagManagerWindow.dataLayer.push({
      event: eventName,
      page: { path, title },
      ...metadata
    });
  }

  public event(eventName: string, params: Record<string, unknown>): void {
    if (!this.tagManagerWindow.dataLayer) return;
    this.tagManagerWindow.dataLayer.push({ event: eventName, ...params });
  }

  private listenForRouteChanges(): void {
    if (!this.googleTagManagerKey || this.routeSubscription) return;
    this.routeSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && this.tagManagerWindow.dataLayer) {
        this.tagManagerWindow.dataLayer.push({
          event: 'pageview',
          page: {
            path: event.urlAfterRedirects,
            title: this.title.getTitle()
          }
        });
      }
    });
  }
}
