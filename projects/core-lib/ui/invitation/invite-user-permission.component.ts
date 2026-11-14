import {Component, Input} from '@angular/core';
import { FormGroup } from '@angular/forms';
import type { ErrorMessagesModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';

@Component({
    selector: 'xuilib-invite-permission-form',
    templateUrl: './invite-user-permission.component.html',
    standalone: false
})

  export class InviteUserPermissionComponent {
    @Input() public inviteUserForm: FormGroup;
    public get rolesGroup(): FormGroup { return this.inviteUserForm.get('roles') as FormGroup; }
    @Input() public isPuiCaseManager: boolean = false;
    @Input() public isPuiUserManager: boolean = false;
    @Input() public isPuiOrganisationManager: boolean = false;
    @Input() public isPuiFinanceManager: boolean = false;
    @Input() public errorMessages: ErrorMessagesModel;
  }
