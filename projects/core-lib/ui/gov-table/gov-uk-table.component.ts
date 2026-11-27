import { formatDate } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'xuilib-gov-uk-table',
  templateUrl: './gov-uk-table.component.html',
  styleUrls: ['./gov-uk-table.component.scss'],
  standalone: false,
})
export class GovukTableComponent {
  @Input() public classes = '';
  @Input() public caption = 'Dates and amounts';
  @Input() public firstCellIsHeader = true;
  // Preserve the legacy public contract for heterogeneous caller-owned row values.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() public rows: any;
  @Input() public columnConfig: GovukTableColumnConfig[] = [
    { header: 'Date', key: 'date', type: 'text' },
    { header: 'Amount', key: 'amount' },
  ];

  public formatDate(date: Date): string {
    return formatDate(date, 'dd/MM/yyyy', 'en-UK');
  }
}

export class GovukTableColumnConfig {
  public header: string;
  public key: string;
  public type?: string;

  constructor() {
    this.header = '';
    this.key = '';
    this.type = 'text';
  }
}
