import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserDetails } from '@hmcts/rpx-xui-core-lib/case/sharing';

@Component({
    selector: 'xuilib-user-select',
    templateUrl: './user-select.component.html',
    styleUrls: ['./user-select.component.scss'],
    standalone: false
})
export class UserSelectComponent implements OnInit, OnDestroy {

  private valueSubscription: Subscription;
  private readonly usersSubject = new BehaviorSubject<UserDetails[]>([]);

  @Input() public set users(value: UserDetails[]) { this.usersSubject.next(value ?? []); }
  public get users(): UserDetails[] { return this.usersSubject.value; }
  @Input() public label = 'Find a person';

  @Output() public selected = new EventEmitter<UserDetails>();

  public filteredUsers: Observable<UserDetails[]>;

  public control = new FormControl();

  constructor() { }

  public ngOnInit() {
    this.filteredUsers = combineLatest([this.control.valueChanges, this.usersSubject]).pipe(
      map(([value, users]) => typeof value === 'string' ? this.filterUsers(value) : users)
    );
    // TEST-TODO
    // these are changes made per ngModel 18 upgrade and may not be correct
    // TODO: Confirm changes are correctly picked up post Angular 18 upgrade
    this.valueSubscription = this.control.valueChanges.subscribe(newUserValue => {
      if (!newUserValue || !newUserValue.email) {
        this.selected.emit(null);
      }
    });
  }

  public ngOnDestroy(): void {
    this.valueSubscription?.unsubscribe();
  }

  public displayValue(user: UserDetails): string {
    return user ? `${user.firstName} ${user.lastName} - ${user.email}` : '';
  }

  public onSelected(e: MatAutocompleteSelectedEvent) {
    this.selected.emit(e.option.value);
  }

  public clear() {
    this.control.setValue(null);
  }

  private filterUsers(value: string): UserDetails[] {
    if (value) {
      value = value.toLowerCase();
      return this.users.filter(user => {
        if (user.firstName.toLowerCase().includes(value)) {
          return true;
        }
        if (user.lastName.toLowerCase().includes(value)) {
          return true;
        }
        if (user.email.toLowerCase().includes(value)) {
          return true;
        }
        return false;
      });
  }
    return [];
  }
}
