import { AfterViewInit, Component, Inject, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface HmctsErrorMessage {
  id: string;
  message: string;
}

@Component({
  selector: 'xuilib-hmcts-error-summary',
  templateUrl: './hmcts-error-summary.component.html',
  standalone: false,
})
export class HmctsErrorSummaryComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() set errorMessages(value: HmctsErrorMessage[] | null | undefined) {
    this.messages = value ?? [];
  }

  @Input() header = '';
  @Input() showWarningMessage = false;
  messages: HmctsErrorMessage[] = [];
  private focusTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  ngAfterViewInit(): void {
    this.scrollTo('errorSummary');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['errorMessages']) {
      clearTimeout(this.focusTimer);
      this.focusTimer = setTimeout(() => this.scrollTo('errorSummary'));
      this.updatePageTitle();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.focusTimer);
  }

  scrollTo(id: string): void {
    this.document.getElementById(id)?.focus();
  }

  hasElement(id: string): boolean {
    return this.document.getElementById(id) !== null;
  }

  private updatePageTitle(): void {
    const hasErrors = !this.showWarningMessage && this.messages.length > 0;
    if (hasErrors && !this.document.title.startsWith('Error:')) {
      this.document.title = `Error: ${this.document.title}`;
    } else if (!hasErrors && this.document.title.startsWith('Error:')) {
      this.document.title = this.document.title.replace(/^Error:\s*/, '');
    }
  }
}
