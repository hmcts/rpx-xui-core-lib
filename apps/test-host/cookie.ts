import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie';

declare global { interface Window { cookieProbe: CookieService; } }

@Component({ selector: 'core-cookie-host', template: '<main><h1>Cookie service test host</h1></main>' })
class CookieGallery {}

export function startCookieGallery() {
  return bootstrapApplication(CookieGallery).then(app => { window.cookieProbe = app.injector.get(CookieService); });
}
