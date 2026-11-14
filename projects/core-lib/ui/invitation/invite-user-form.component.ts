import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormGroup} from '@angular/forms';

@Component({
    selector: 'xuilib-invite-user-form',
    templateUrl: './invite-user-form.component.html',
    standalone: false
})

export class InviteUserFormComponent {

  // Keep the open legacy error shape for existing consumers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public isInvalid: any;

  @Output() public submitForm = new EventEmitter();
  @Input() public inviteUserForm: FormGroup;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() public set errorMessages(value: any) {
    this.isInvalid = value || {} ;
  }

  public onSubmit() {
    this.submitForm.emit();
  }
}
