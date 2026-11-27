import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { InviteUserFormComponent } from './invite-user-form.component';
import { InviteUserPermissionComponent } from './invite-user-permission.component';
import { GovUkCheckboxComponent } from './gov-uk-checkbox.component';
import { GovUkFieldsetComponent } from '@hmcts/rpx-xui-core-lib/ui/form-group';
import { GovUkFormGroupWrapperComponent } from '@hmcts/rpx-xui-core-lib/ui/form-group';
import { FormGroupModule } from '@hmcts/rpx-xui-core-lib/ui/form-group';

@NgModule({ declarations:[InviteUserFormComponent, InviteUserPermissionComponent, GovUkCheckboxComponent], imports:[CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule, FormGroupModule], exports:[InviteUserFormComponent, InviteUserPermissionComponent, GovUkCheckboxComponent, GovUkFieldsetComponent, GovUkFormGroupWrapperComponent] })
export class InvitationModule {}
