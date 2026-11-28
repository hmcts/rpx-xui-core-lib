import { Component, importProvidersFrom } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovCheckboxModule } from '@hmcts/rpx-xui-core-lib/ui/gov-checkbox';
import { GovUiConfigModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';

@Component({
  selector: 'core-commonlib-checkbox-host',
  imports: [GovCheckboxModule],
  template: `<main id="core-commonlib-checkbox-host">
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <xuilib-gov-checkbox [group]="permissions" [config]="organisationConfig" />
    <xuilib-gov-checkbox [group]="permissions" [config]="adminConfig" [isChecked]="true" />
    <output data-testid="case-management-value">{{ permissions.get('enableCaseManagement')?.value }}</output>
    <output data-testid="admin-value">{{ permissions.get('isCaseAccessAdmin')?.value }}</output>
  </main>`,
})
class CommonLibCheckboxGallery {
  readonly permissions = new FormGroup({
    enableCaseManagement: new FormControl(false, { nonNullable: true }),
    isCaseAccessAdmin: new FormControl(true, { nonNullable: true }),
  });
  readonly organisationConfig: GovUiConfigModel = {
    id: '',
    value: 'enableCaseManagement',
    name: 'enableCaseManagement',
    label: 'Manage cases for your organisation',
    hint: 'This allows the user to submit and manage cases on behalf of your organisation',
  };
  readonly adminConfig: GovUiConfigModel = {
    id: '',
    value: 'isCaseAccessAdmin',
    name: 'roles',
    focusOn: 'admin-access-control',
    label: 'Case access administrator',
    hint: 'This allows the user to manage access to cases within your organisation',
  };

  constructor(readonly translations: RpxTranslationService) {}
}

export function startCommonlibCheckboxGallery() {
  return bootstrapApplication(CommonLibCheckboxGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))],
  });
}
