import { CommonModule } from '@angular/common';
import { Component, Pipe, PipeTransform } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { ErrorMessage } from '../../projects/core-lib/case/editor-source/lib/shared/domain/error-message.model';
import { ErrorMessageComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/error-message/error-message.component';

@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}

@Component({
  selector: 'test-error-summary-route',
  template: `<form [formGroup]="formGroup">
    <label for="case-title">Case title</label>
    <input id="case-title" formControlName="title">
    <exui-error-message [error]="error"></exui-error-message>
  </form>`,
  standalone: false
})
class ErrorSummaryRouteComponent {
  public readonly formGroup = new FormGroup({ title: new FormControl('') });
  public readonly error: ErrorMessage = {
    title: 'There is a problem',
    description: 'Enter a case title',
    fieldId: 'case-title'
  };
}

@Component({
  selector: 'test-error-summary-app',
  template: '<router-outlet></router-outlet>',
  standalone: false
})
class ErrorSummaryAppComponent {}

let fixture: ReturnType<typeof TestBed.createComponent<ErrorSummaryAppComponent>>;

export async function createErrorSummaryHost(): Promise<void> {
  TestBed.resetTestingModule();
  if (!document.querySelector('base')) {
    const base = document.createElement('base');
    base.href = '/';
    document.head.prepend(base);
  }
  await TestBed.configureTestingModule({
    imports: [
      CommonModule,
      ReactiveFormsModule,
      RouterModule.forRoot([
        { path: 'cases/:caseId/edit', component: ErrorSummaryRouteComponent }
      ], { anchorScrolling: 'enabled' })
    ],
    declarations: [ErrorSummaryAppComponent, ErrorSummaryRouteComponent, ErrorMessageComponent, TranslatePipe]
  }).compileComponents();

  fixture = TestBed.createComponent(ErrorSummaryAppComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  await TestBed.inject(Router).navigateByUrl('/cases/123/edit');
  fixture.detectChanges();
  await fixture.whenStable();
}

export function readErrorSummaryRouterUrl(): string {
  return TestBed.inject(Router).url;
}
