import { Component, DestroyRef, EnvironmentInjector, createEnvironmentInjector, importProvidersFrom, inject, signal } from '@angular/core';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { RpxTranslationModule as LegacyModule, RpxTranslationService as LegacyService } from 'rpx-xui-translation';

@Component({
  selector: 'counterpart-shared', imports: [LegacyModule],
  template: `<p data-testid="legacy-phrase">{{'Shared phrase' | rpxTranslate}}</p>`,
})
class SharedChild {}

@Component({
  selector: 'counterpart-scoped', imports: [LegacyModule], providers: [LegacyService],
  template: `<p data-testid="scoped-identity">{{independent ? 'independent' : 'duplicated root'}}</p>
    <button (click)="service.language='cy'">Scoped Welsh</button><p data-testid="scoped-phrase">{{'Scoped phrase' | rpxTranslate}}</p>`,
})
class ScopedChild {
  service = inject(LegacyService);
  independent = this.service !== inject(EnvironmentInjector).get(RpxTranslationService);
}

@Component({
  imports: [RpxTranslationModule, SharedChild, ScopedChild],
  template: `<h2>Translation counterpart proof</h2><p data-testid="counterpart-identity">{{shared ? 'shared' : 'different providers'}}</p>
    <button (click)="service.language='cy'">Shared Welsh</button><button (click)="service.language='en'">Shared English</button>
    <p data-testid="core-phrase">{{'Shared phrase' | rpxTranslate}}</p><button (click)="showShared.set(!showShared())">Toggle shared child</button>
    @if (showShared()) {<counterpart-shared/>}
    <button (click)="showScoped.set(!showScoped())">{{showScoped() ? 'Destroy scoped owner' : 'Show scoped owner'}}</button>
    @if (showScoped()) {<counterpart-scoped/>}`,
})
export class TranslationPage {
  service = inject(RpxTranslationService);
  showShared = signal(true);
  showScoped = signal(false);
  private child = createEnvironmentInjector([importProvidersFrom(LegacyModule.forChild())], inject(EnvironmentInjector));
  shared = this.service === inject(LegacyService) && this.service === this.child.get(LegacyService) && this.service === this.child.get(RpxTranslationService);
  constructor() { inject(DestroyRef).onDestroy(() => this.child.destroy()); }
}
