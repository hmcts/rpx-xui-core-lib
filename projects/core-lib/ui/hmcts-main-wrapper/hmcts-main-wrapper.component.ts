import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { HmctsBannerInfo } from './hmcts-banner-info.interface';

@Component({
  selector: 'xuilib-hmcts-main-wrapper',
  templateUrl: './hmcts-main-wrapper.component.html',
  styleUrls: ['./hmcts-main-wrapper.component.scss'],
  standalone: false,
})
export class HmctsMainWrapperComponent {
  public bannerData: HmctsBannerInfo;

  @Input() public backLink: string | undefined;
  @Input() public title: string;
  @Input() public summaryErrors: {header: string; isFromValid: boolean; items: { id: string;
    // CommonLib exposed this input as any; preserve consumer compatibility at this public boundary.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any;
  }[]};
  @Input() public set banner(value: HmctsBannerInfo) {
    this.bannerData = value;
  }
  @Input() public actionButtons: {name: string, class: string, action(): void}[];
  @Input() public showWarningMessage: boolean;

  @Output() public backEvent = new EventEmitter<void>();

  public get hasBackLink(): boolean {
    return this.backLink !== undefined || this.backEvent.observers.length > 0;
  }

  public onGoBack(): void {
    this.backEvent.emit();
  }
}
