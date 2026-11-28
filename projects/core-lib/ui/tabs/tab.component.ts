import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';

export interface TabItem {
  text: string;
}

@Component({ selector: 'xuilib-tab', templateUrl: './tab.component.html', standalone: false })
export class TabComponent {
  @Input() public tabItems: TabItem[] = [];
  @Input() public ariaLabel?: string;
  @Output() public tabChange = new EventEmitter<MatTabChangeEvent>();

  public tabChanged(event: MatTabChangeEvent): void {
    this.tabChange.emit(event);
  }
}
