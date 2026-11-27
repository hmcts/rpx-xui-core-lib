import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { GovUkFormGroupWrapperComponent } from './gov-uk-form-group-wrapper.component';
import { GovUkFieldsetComponent } from './gov-uk-fieldset.component';
import { RemoveHostDirective } from './remove-host.directive';
@NgModule({ declarations: [GovUkFormGroupWrapperComponent, GovUkFieldsetComponent, RemoveHostDirective],
  imports: [CommonModule, RpxTranslationModule, GovInputModule],
  exports: [GovUkFormGroupWrapperComponent, GovUkFieldsetComponent, RemoveHostDirective] })
export class FormGroupModule {}
