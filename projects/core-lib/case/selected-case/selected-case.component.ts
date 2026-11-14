import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { SharedCase } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { UserDetails } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';

@Component({
    selector: 'xuilib-selected-case',
    templateUrl: './selected-case.component.html',
    styleUrls: ['./selected-case.component.scss'],
    standalone: false
})
export class SelectedCaseComponent implements OnInit, OnChanges, OnDestroy {

  private stateSubscription: Subscription;

  @Input() public sharedCase: SharedCase;
  @Input() public selectedUser: UserDetails;
  @Input() public opened = false;
  @Input() public removeUserFromCaseToggleOn: boolean;
  @Input() public caseCount: number;

  @Output() public unselect = new EventEmitter<SharedCase>();
  @Output() public synchronizeStore = new EventEmitter<SharedCase[]>();

  public shareCases: SharedCase[];
  public shareCases$: Observable<SharedCase[]>;

  public combinedSortedShares: UserDetails[];

  constructor(private readonly stateService: CaseSharingStateService) { }

  public ngOnInit() {
    this.shareCases$ = this.stateService.state;
    this.stateSubscription = this.shareCases$.subscribe(shareCases => this.shareCases = shareCases);

  }

  public ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.sharedCase) {
      const sharedWith = this.sharedCase.sharedWith ? this.sharedCase.sharedWith : [];
      const pendingShares = this.sharedCase.pendingShares ? this.sharedCase.pendingShares : [];
      this.combinedSortedShares = this.combineAndSortShares(sharedWith, pendingShares);
    }
  }

  public onDeselect(c: SharedCase): void {
    this.unselect.emit(c);
  }

  public trackByUserId(user: UserDetails): string {
    return user.idamId;
  }

  public canRemove(caseId: string, user: UserDetails): Observable<boolean> {
    return this.shareCases$.pipe(map(cases => {
      if (this.removeUserFromCaseToggleOn) {
        for (const aCase of cases) {
          if (aCase.caseId === caseId) {
            if (aCase.pendingUnshares && aCase.pendingUnshares.some(u => u.idamId === user.idamId)) {
              return false;
            }
            if (aCase.sharedWith && aCase.sharedWith.some(u => u.idamId === user.idamId)) {
              return true;
            }
          }
        }
      }
      return false;
    }));
  }

  public canCancel(caseId: string, user: UserDetails): Observable<boolean> {
    return this.shareCases$.pipe(map(cases => {
      for (const aCase of cases) {
        if (aCase.caseId === caseId) {
          if (aCase.pendingShares && aCase.pendingShares.some(u => u.idamId === user.idamId)) {
            return true;
          }
          if (aCase.pendingUnshares && aCase.pendingUnshares.some(u => u.idamId === user.idamId)) {
            return true;
          }
          return false;
        }
      }
    }));
  }

  public isToBeRemoved(caseId: string, user: UserDetails): Observable<boolean> {
    return this.shareCases$.pipe(map(cases => {
      for (const aCase of cases) {
        if (aCase.caseId === caseId) {
          return aCase.pendingUnshares && aCase.pendingUnshares.some(u => u.idamId === user.idamId);
        }
      }
    }));
  }

  public isToBeAdded(caseId: string, user: UserDetails): Observable<boolean> {
    return this.shareCases$.pipe(map(cases => {
      for (const aCase of cases) {
        if (aCase.caseId === caseId) {
          return aCase.pendingShares && aCase.pendingShares.some(u => u.idamId === user.idamId);
        }
      }
    }));
  }

  public onRemove(user: UserDetails, sharedCase: SharedCase): void {
    this.stateService.requestUnshare(user, sharedCase.caseId);
    this.synchronizeStore.emit(this.shareCases);
  }

  public onCancel(user: UserDetails, sharedCase: SharedCase): void {
    this.stateService.requestCancel(sharedCase.caseId, user);
    this.synchronizeStore.emit(this.shareCases);
  }

  public showNoUsersAccessInfo(): boolean {
    // A user is added to a case
    if (this.sharedCase.pendingShares) {
      if (this.sharedCase.pendingShares.length > 0) {
        return false;
      }
    }
    // A case has 0 users with access to it
    if (this.sharedCase.sharedWith) {
      if (this.sharedCase.sharedWith.length === 0) {
        return true;
      }
    }
    // Access to the last user is removed
    if (this.sharedCase.sharedWith && this.sharedCase.pendingUnshares) {
      if (this.sharedCase.pendingUnshares.length > 0
        && this.sharedCase.sharedWith.length === this.sharedCase.pendingUnshares.length) {
        return true;
      }
    }
    return false;
  }

  public showUserHasAccessInfo(): boolean {
    return !this.showNoUsersAccessInfo();
  }

  public showUserAccessTable(): boolean {
    if (this.sharedCase.pendingShares) {
      if (this.sharedCase.pendingShares.length > 0) {
        return true;
      }
    }
    if (this.sharedCase.sharedWith) {
      if (this.sharedCase.sharedWith.length > 0) {
        return true;
      }
    }
    return false;
  }

  public combineAndSortShares(sharedWith: UserDetails[], pendingShares: UserDetails[]): UserDetails[] {
    return [
      ...sharedWith,
      ...pendingShares
    ].sort((user1, user2) => {
      return user1.firstName.toLowerCase() > user2.firstName.toLowerCase() ? 1 : (user2.firstName.toLowerCase() > user1.firstName.toLowerCase() ? -1 : 0);
    });
  }

  public userIdSetter(isPending: boolean, id: number): string {
    return isPending ? `pendingShares-${id}` : `${id}`;
  }

  public buildElementId(elementName: string): string {
    return `${elementName}-${this.sharedCase.caseId}`;
  }
}
