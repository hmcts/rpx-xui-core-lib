import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { SharedCase } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';

@Component({
    selector: 'xuilib-selected-case-list',
    templateUrl: './selected-case-list.component.html',
    styleUrls: ['./selected-case-list.component.scss'],
    standalone: false
})
export class SelectedCaseListComponent implements OnInit, OnDestroy {

  private stateSubscription: Subscription;

  public shareCases: SharedCase[] = [];
  public caseCount: number;

  @Input() public shareCases$: Observable<SharedCase[]>;

  @Input() public removeUserFromCaseToggleOn: boolean;

  @Input() public toConfirm: boolean = false;

  @Input() public changeLink: string = '';

  @Output() public unselect = new EventEmitter<SharedCase>();
  @Output() public synchronizeStore = new EventEmitter<SharedCase[]>();

  constructor(private readonly stateService: CaseSharingStateService) { }

  public ngOnInit() {
    this.shareCases$ = this.stateService.state;
    this.stateSubscription = this.shareCases$.subscribe((shareCases) => {
      this.shareCases = shareCases;
      this.caseCount = this.shareCases.length;
    });
  }

  public ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
  }

  public onUnselect(sharedCase: SharedCase): void {
    this.unselect.emit(sharedCase);
    this.caseCount = this.shareCases.length;
  }

  public onSynchronizeStore(event: SharedCase[]): void {
    this.synchronizeStore.emit(event);
  }

  public trackByCaseId(sharedCase: SharedCase): string {
    return sharedCase.caseId;
  }
}
