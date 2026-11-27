import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

// Preserve the legacy generic default so existing unparameterized template contexts retain their public type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LetContext<T = any> {
  public $implicit: T = null;
  public xuilibLet: T = null;
}

@Directive({
  selector: '[xuilibLet]',
  standalone: false,
})
// Preserve the directive's existing unparameterized generic contract alongside LetContext.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LetDirective<T = any> {
  private readonly context: LetContext<T> = new LetContext<T>();

  constructor(private readonly viewContainer: ViewContainerRef, templateRef: TemplateRef<LetContext<T>>) {
    this.viewContainer.createEmbeddedView(templateRef, this.context);
  }

  @Input() public set xuilibLet(condition: T) {
    this.context.$implicit = this.context.xuilibLet = condition;
  }
}
