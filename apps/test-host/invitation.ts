import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { InvitationModule } from '@hmcts/rpx-xui-core-lib/ui/invitation';
import type { ErrorMessagesModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';

@Component({selector:'core-test-host', imports:[InvitationModule], template:`<main><h1>Invitation diagnostic</h1>
<xuilib-invite-user-form [inviteUserForm]="form" [errorMessages]="errors" (submitForm)="submit()" />
<output data-testid="submitted">{{ submitted }}</output></main>`})
class InvitationGallery {
  readonly form = new FormGroup({ firstName:new FormControl('',Validators.required), lastName:new FormControl('',Validators.required), email:new FormControl('',[Validators.required,Validators.email]), roles:new FormGroup({'pui-case-manager':new FormControl(false), 'pui-user-manager':new FormControl(new URLSearchParams(window.location.search).has('preselected')), 'pui-organisation-manager':new FormControl(false)}) });
  errors: Record<string, ErrorMessagesModel> = {};
  submitted = '';
  submit() {
    this.errors = {};
    for (const [name, message] of Object.entries({firstName:'Enter a first name',lastName:'Enter a last name',email:'Enter a valid email address'})) {
      if (this.form.get(name)?.invalid) this.errors[name] = {isInvalid:true, messages:[message]};
    }
    if (!Object.values(this.form.controls.roles.getRawValue()).some(Boolean)) this.errors.roles = {isInvalid:true, messages:new URLSearchParams(window.location.search).has('emptyRoleError') ? [] : ['Choose at least one permission']};
    this.submitted = JSON.stringify(this.form.getRawValue());
  }
}
export function startInvitationGallery() { return bootstrapApplication(InvitationGallery,{providers:[importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations',debounceTimeMs:20,validity:{days:1},testMode:false}))]}); }
