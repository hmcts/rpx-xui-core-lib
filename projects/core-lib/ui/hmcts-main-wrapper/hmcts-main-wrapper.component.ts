import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { HmctsBannerInfo } from './hmcts-banner-info.interface';

export interface HmctsMainWrapperSummaryErrors {
  header: string;
  /** Retains the CommonLib public spelling used by existing consumers. */
  isFromValid: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Keep CommonLib's public error-message type compatible.
  items: { id: string; message: any }[];
}

export interface HmctsMainWrapperActionButton {
  name: string;
  class: string;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Preserve the existing CommonLib callback return type.
  action(): {};
}

@Component({
  selector: 'xuilib-hmcts-main-wrapper',
  templateUrl: './hmcts-main-wrapper.component.html',
  styleUrls: ['./hmcts-main-wrapper.component.scss'],
  standalone: false,
})
export class HmctsMainWrapperComponent {
  @Input() backLink: string | undefined;
  @Input() title: string | undefined;
  @Input() summaryErrors: HmctsMainWrapperSummaryErrors | null | undefined;
  @Input() actionButtons: HmctsMainWrapperActionButton[] | null | undefined;
  @Input() showWarningMessage = false;
  @Input() set banner(value: HmctsBannerInfo | undefined) {
    this.bannerData = value;
  }

  @Output() backEvent = new EventEmitter<void>();

  bannerData: HmctsBannerInfo | undefined;

  get hasBackLink(): boolean {
    return this.backLink !== undefined || this.backEvent.observers.length > 0;
  }

  get showEventBackButton(): boolean {
    return this.backLink === undefined && this.backEvent.observers.length > 0;
  }

  onGoBack(): void {
    this.backEvent.emit();
  }
}
