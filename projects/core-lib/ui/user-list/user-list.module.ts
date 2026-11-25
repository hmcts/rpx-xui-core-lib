import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsPaginationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-pagination';
import { UserListComponent } from './user-list.component';

@NgModule({ declarations: [UserListComponent], imports: [CommonModule, RouterModule, NgxPaginationModule, RpxTranslationModule, HmctsPaginationModule], exports: [HmctsPaginationModule, UserListComponent] })
export class UserListModule {}
