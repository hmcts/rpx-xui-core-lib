import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

export class LetContext<T = unknown> {
  public $implicit: T | null = null;
  public xuilibLet: T | null = null;
}

@Directive({ selector: '[xuilibLet]', standalone: false })
export class LetDirective<T = unknown> {
  private readonly context = new LetContext<T>();
  constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<LetContext<T>>) {
    viewContainer.createEmbeddedView(templateRef, this.context);
  }

  @Input()
  public set xuilibLet(value: T | null) {
    this.context.$implicit = this.context.xuilibLet = value;
  }

  public static ngTemplateContextGuard<T>(
    _directive: LetDirective<T>,
    context: unknown,
  ): context is LetContext<T> {
    void context;
    return true;
  }
}
