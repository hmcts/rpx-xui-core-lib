import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { SharedCase } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { UserDetails } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';

@Component({
    selector: 'xuilib-selected-case-confirm',
    templateUrl: './selected-case-confirm.component.html',
    styleUrls: ['./selected-case-confirm.component.scss'],
    standalone: false
})
export class SelectedCaseConfirmComponent implements OnInit, OnDestroy {

  private stateSubscription: Subscription;

  @Input() public sharedCase: SharedCase;
  @Input() public idPrefix = '';
  @Input() public changeLink: string = '';

  public shareCases: SharedCase[];
  public shareCases$: Observable<SharedCase[]>;

  constructor(private readonly stateService: CaseSharingStateService) { }

  public ngOnInit() {
    this.shareCases$ = this.stateService.state;
    this.stateSubscription = this.shareCases$.subscribe(shareCases => this.shareCases = shareCases);
  }

  public ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
  }

  public trackByUserId(user: UserDetails): string {
    return user.idamId;
  }

  public showUserAccessBlock(): boolean {
    if (this.sharedCase.pendingShares && this.sharedCase.pendingShares.length > 0) {
      return true;
    }
    return this.sharedCase.pendingUnshares && this.sharedCase.pendingUnshares.length > 0;
  }
}
