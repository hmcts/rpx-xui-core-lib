import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'xuilib-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  standalone: false,
})
export class PaginationComponent {
  @Input() public paginationId = 'pagination-label';
  @Input() public navigationLabel = 'Pagination navigation';
  @Input() public moreItems: boolean;
  @Input() public firstRecord: number;
  // Keep the legacy event type for source compatibility; runtime always emits null.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() public previousPage: EventEmitter<any> = new EventEmitter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() public nextPage: EventEmitter<any> = new EventEmitter();

  public onPrevious(): void {
    this.previousPage.emit(null);
  }

  public onNext(): void {
    this.nextPage.emit(null);
  }
}
