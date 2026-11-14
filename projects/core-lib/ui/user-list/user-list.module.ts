import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsPaginationComponent } from './hmcts-pagination.component';
import { UserListComponent } from './user-list.component';

@NgModule({ declarations: [HmctsPaginationComponent, UserListComponent], imports: [CommonModule, RouterModule, NgxPaginationModule, RpxTranslationModule], exports: [HmctsPaginationComponent, UserListComponent] })
export class UserListModule {}
