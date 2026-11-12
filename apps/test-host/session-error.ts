import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { SessionErrorPageComponent } from '@hmcts/rpx-xui-core-lib/case/session-error';

@Component({
  selector: 'core-session-error-host',
  imports: [SessionErrorPageComponent],
  template: `<button type="button" (click)="custom = !custom">Change messages</button>
    @if (custom) {
      <ccd-session-error-page title="Custom session heading" primaryMessage="First custom message" secondaryMessage="Second custom message" />
    } @else {
      <ccd-session-error-page />
    }`,
})
class SessionErrorGallery { custom = false; }

export function startSessionErrorGallery() {
  return bootstrapApplication(SessionErrorGallery);
}
