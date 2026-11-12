import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { FeatureToggleService } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';

@Directive({ selector: '[xuilibFeatureToggle]', standalone: false })
export class FeatureToggleDirective implements OnDestroy {
  private subscription: Subscription;
  private destroyed = false;

  @Input() public set xuilibFeatureToggle(feature: string) {
    if (this.destroyed) return;
    const previous = this.subscription;
    const cancelled = new Subject<void>();
    const owner = new Subscription(() => { cancelled.next(); cancelled.complete(); });
    this.subscription = owner;
    previous?.unsubscribe();
    if (owner.closed) return;
    this.viewContainer.clear();
    if (owner.closed) return;
    const enabled = this.service.isEnabled(feature);
    if (owner.closed) return;
    owner.add(enabled.pipe(takeUntil(cancelled)).subscribe({
      next: enabled => {
        if (enabled) {
          if (this.viewContainer.length === 0) {
            this.viewContainer.createEmbeddedView(this.templateRef);
          }
        } else {
          this.viewContainer.clear();
        }
      },
      error: (error: unknown) => {
        this.viewContainer.clear();
        throw error;
      }
    }));
  }

  constructor(
    private readonly service: FeatureToggleService,
    private readonly viewContainer: ViewContainerRef,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published legacy directive constructor type.
    private readonly templateRef: TemplateRef<any>
  ) {}

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.subscription?.unsubscribe();
  }
}
