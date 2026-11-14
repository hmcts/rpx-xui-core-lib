import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { InviteUserFormComponent } from './invite-user-form.component';
import { InviteUserPermissionComponent } from './invite-user-permission.component';
import { GovUkCheckboxComponent } from './gov-uk-checkbox.component';
import { GovUkFieldsetComponent } from './gov-uk-fieldset.component';
import { GovUkFormGroupWrapperComponent } from './gov-uk-form-group-wrapper.component';
import { RemoveHostDirective } from './remove-host.directive';

@NgModule({ declarations:[InviteUserFormComponent, InviteUserPermissionComponent, GovUkCheckboxComponent, GovUkFieldsetComponent, GovUkFormGroupWrapperComponent, RemoveHostDirective], imports:[CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule], exports:[InviteUserFormComponent, InviteUserPermissionComponent, GovUkCheckboxComponent, GovUkFieldsetComponent, GovUkFormGroupWrapperComponent] })
export class InvitationModule {}
