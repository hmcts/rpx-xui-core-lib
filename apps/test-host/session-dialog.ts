import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { SessionDialogModule } from '@hmcts/rpx-xui-core-lib/ui/session-dialog';

@Component({
  selector: 'core-session-dialog-host',
  imports: [SessionDialogModule],
  template: `<main>@if (showOpener) {<button type="button" (click)="visible = true">Open session dialog</button>}
    <button type="button" (click)="backgroundClicks = backgroundClicks + 1">Background action</button>
    <button type="button" (click)="positionTop = '300px'">Use large top offset</button>
    <p>Background clicks: {{ backgroundClicks }}</p>
    @if (visible) {<xuilib-session-dialog #dialog [positionTop]="positionTop" (close)="closed = closed + 1">
      <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
      <button type="button" (click)="dialog.onClose()">Invoke close</button>
      <button type="button" (click)="secondVisible = true">Open second dialog</button>
      <button type="button" (click)="showOpener = false; visible = false">Remove opener and close</button>
      <p>Close events: {{ closed }}</p>
      <p>For your security, sign out in 30 seconds.</p>
      <button type="button" (click)="stayed = true; visible = false">Stay signed in</button>
      <p>Stay signed in selected: {{ stayed }}</p>
    </xuilib-session-dialog>}
    @if (secondVisible) {<xuilib-session-dialog><button type="button" (click)="secondVisible = false">Close second dialog</button></xuilib-session-dialog>}
  </main>`,
})
class SessionDialogGallery {
  positionTop = '30px';
  visible = false;
  secondVisible = false;
  showOpener = true;
  backgroundClicks = 0;
  closed = 0;
  stayed = false;
  constructor(public translations: RpxTranslationService) {}
}
export function startSessionDialogGallery() {
  return bootstrapApplication(SessionDialogGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))],
  });
}
