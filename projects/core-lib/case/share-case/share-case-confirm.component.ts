import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { SharedCase } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';

@Component({
    selector: 'xuilib-share-case-confirm',
    templateUrl: './share-case-confirm.component.html',
    styleUrls: ['./share-case-confirm.component.scss'],
    standalone: false
})
export class ShareCaseConfirmComponent implements OnInit, OnDestroy {

  private stateSubscription: Subscription;

  public shareCases: SharedCase[] = []; // cases selected for sharing

  @Input() public shareCases$: Observable<SharedCase[]>;
  @Input() public changeLink: string = '';
  @Input() public completeLink: string = '';

  public state$: Observable<SharedCase[]>;

  constructor(private readonly stateService: CaseSharingStateService) { }

  public ngOnInit() {
    this.stateSubscription = this.shareCases$.subscribe(shareCases => {
      this.shareCases = shareCases;
      this.stateService.setCases(shareCases);
    });
    this.shareCases$ = this.stateService.state;
  }

  public ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
  }

}
