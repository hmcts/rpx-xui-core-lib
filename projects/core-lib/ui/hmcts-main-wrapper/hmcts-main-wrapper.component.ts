import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { HmctsErrorMessage } from '@hmcts/rpx-xui-core-lib/ui/hmcts-error-summary';

export interface HmctsMainWrapperBanner {
  message: string;
  type: 'warning' | 'success' | 'information';
  title?: string;
  showMessageIcon?: boolean;
  messageBoldText?: boolean;
}

export interface HmctsMainWrapperActionButton {
  name: string;
  class: string;
  action: () => void;
}

export interface HmctsMainWrapperSummaryErrors {
  header: string;
  isFromValid: boolean;
  items: HmctsErrorMessage[];
}

@Component({
  selector: 'xuilib-hmcts-main-wrapper',
  templateUrl: './hmcts-main-wrapper.component.html',
  styleUrl: './hmcts-main-wrapper.component.scss',
  standalone: false,
})
export class HmctsMainWrapperComponent implements OnInit {
  @Input() backLink: string | undefined;
  @Input() title: string | undefined;
  @Input() summaryErrors: HmctsMainWrapperSummaryErrors | null | undefined;
  @Input() banner: HmctsMainWrapperBanner | null | undefined;
  @Input() actionButtons: HmctsMainWrapperActionButton[] | null | undefined;
  @Input() showWarningMessage: boolean | undefined;
  @Output() backEvent = new EventEmitter<void>();

  hasBackLink = false;

  ngOnInit(): void {
    this.hasBackLink = this.backLink !== undefined || this.backEvent.observers.length > 0;
  }

  onGoBack(): void {
    this.backEvent.emit();
  }
}
