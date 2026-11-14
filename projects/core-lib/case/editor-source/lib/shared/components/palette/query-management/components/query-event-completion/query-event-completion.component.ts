import { Component, Input } from '@angular/core';
import { EventCompletionParams } from '../../../../case-editor/domain/event-completion-params.model';

@Component({
  selector: 'ccd-query-event-completion',
  templateUrl: './query-event-completion.component.html',
  standalone: false
})
export class QueryEventCompletionComponent {
  @Input() public eventCompletionParams: EventCompletionParams;

  // Preserve the Toolkit callback signature for existing templates.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onEventCanBeCompleted(_value: boolean): void {
    // Submit the query response
  }
}
