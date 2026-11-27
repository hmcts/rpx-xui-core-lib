import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { GovCheckboxModule, GovUkCheckboxComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-checkbox';
import { InviteUserFormComponent } from './invite-user-form.component';
import { InviteUserPermissionComponent } from './invite-user-permission.component';
import { FormGroupModule, GovUkFieldsetComponent, GovUkFormGroupWrapperComponent } from '@hmcts/rpx-xui-core-lib/ui/form-group';

@NgModule({ declarations:[InviteUserFormComponent, InviteUserPermissionComponent], imports:[CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule, FormGroupModule, GovCheckboxModule], exports:[InviteUserFormComponent, InviteUserPermissionComponent, GovCheckboxModule, GovUkCheckboxComponent, GovUkFieldsetComponent, GovUkFormGroupWrapperComponent] })
export class InvitationModule {}
