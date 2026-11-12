import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';
declare global { interface Window { sessionStorageProbe: SessionStorageService; } }
@Component({ selector: 'core-session-storage-host', template: '<main><h1>Session storage test host</h1></main>' })
class SessionStorageGallery {}
export function startSessionStorageGallery() {
  return bootstrapApplication(SessionStorageGallery).then(app => { window.sessionStorageProbe = app.injector.get(SessionStorageService); });
}
