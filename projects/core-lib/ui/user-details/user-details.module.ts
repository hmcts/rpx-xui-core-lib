import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { UserDetailsComponent } from './user-details.component';

@NgModule({ declarations: [UserDetailsComponent], imports: [RouterModule, RpxTranslationModule], exports: [UserDetailsComponent] })
export class UserDetailsModule {}
