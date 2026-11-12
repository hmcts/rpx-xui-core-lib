import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { DueDateModule } from '@hmcts/rpx-xui-core-lib/ui/due-date';

@Component({
  selector: 'core-due-date-host',
  imports: [DueDateModule],
  template: `<main><h1>Due date diagnostic</h1>
    <label for="due-date">Due date</label><input id="due-date" type="date" (input)="update($event)">
    <label for="high-cutoff">High urgency cutoff</label><input id="high-cutoff" type="number" [value]="high" (input)="high = +$any($event.target).value">
    <label for="medium-cutoff">Medium urgency cutoff</label><input id="medium-cutoff" type="number" [value]="medium" (input)="medium = +$any($event.target).value">
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <!-- Legacy input accepts an absent date at runtime despite its non-null TypeScript declaration. -->
    <xuilib-due-date [dueDate]="$any(dueDate)" [highUrgencyCutoff]="high" [mediumUrgencyCutoff]="medium" />
  </main>`,
})
class DueDateGallery {
  dueDate: Date | null = new Date('2026-02-10T12:00:00Z');
  high = 0;
  medium = 2;
  constructor(public translations: RpxTranslationService) {}
  update(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dueDate = value ? new Date(`${value}T12:00:00Z`) : null;
  }
}

export function startDueDateGallery() {
  return bootstrapApplication(DueDateGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))],
  });
}
