import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { User } from '@hmcts/rpx-xui-core-lib/ui/user-details';

interface Pagination { itemsPerPage: number; currentPage: number; totalItems: number; }

@Component({
    selector: 'xuilib-user-list',
    styleUrls: ['./user-list.component.scss'],
    templateUrl: './user-list.component.html',
    standalone: false
})
export class UserListComponent implements OnInit {
    @Input() public users: User[] = [];
    @Input() public currentPageNumber?: number;
    // Preserve the legacy input contract for consumers that pass non-numeric values.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Input() public pageTotalSize?: any;
    @Output() public userClick = new EventEmitter<User>();
    @Output() public pageChange = new EventEmitter();

    public pagination: Pagination;

    public ngOnInit() {
      this.pagination = { itemsPerPage: 50, currentPage: this.currentPageNumber, totalItems: this.pageTotalSize};
    }

    public onUserClick(user: User) {
      this.userClick.emit(user);
    }

    // Preserve the legacy public method contract.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public emitPageClickEvent(pageNumber: any) {
      this.currentPageNumber = pageNumber;
      this.pageChange.emit(pageNumber);
    }
}
