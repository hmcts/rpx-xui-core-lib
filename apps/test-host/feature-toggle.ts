import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { FeatureToggleService } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';
import { FeatureToggleModule } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive';

const a = new Subject<boolean>();
const b = new Subject<boolean>();
const provider = { isEnabled: (key: string) => key === 'a' ? a : b };

@Component({
  selector: 'core-feature-toggle-host',
  imports: [CommonModule, FeatureToggleModule],
  template: `<main>
    <button type="button" (click)="a.next(true)">Enable A</button>
    <button type="button" (click)="a.next(false)">Disable A</button>
    <button type="button" (click)="b.next(true)">Enable B</button>
    <button type="button" (click)="b.next(false)">Disable B</button>
    <button type="button" (click)="feature = 'b'">Switch to B</button>
    <button type="button" (click)="mounted = !mounted">Toggle directive</button>
    <ng-container *ngIf="mounted"><p *xuilibFeatureToggle="feature">Feature content</p></ng-container>
  </main>`
})
class FeatureGallery {
  readonly a = a;
  readonly b = b;
  feature = 'a';
  mounted = true;
}
export function startFeatureToggleGallery() {
  return bootstrapApplication(FeatureGallery, { providers: [{ provide: FeatureToggleService, useValue: provider }] });
}
