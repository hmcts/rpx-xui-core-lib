import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { windowProvider, windowToken } from '@hmcts/rpx-xui-core-lib/browser/window';

declare global { interface Window { windowProbe: unknown; } }

@Component({ selector: 'core-window-host', template: '<main><h1>Window provider test host</h1></main>' })
class WindowGallery { constructor() { window.windowProbe = inject(windowToken); } }

export function startWindowGallery() {
  return bootstrapApplication(WindowGallery, { providers: [{ provide: windowToken, useFactory: windowProvider }] });
}
