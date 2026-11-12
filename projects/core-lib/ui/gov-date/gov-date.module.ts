import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {RpxTranslationModule} from '@hmcts/rpx-xui-core-lib/i18n';
import {GovInputModule} from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import {GovUkDateComponent} from './gov-uk-date/gov-uk-date.component';
import {GovUkFieldsetComponent} from './gov-uk-fieldset/gov-uk-fieldset.component';
@NgModule({declarations:[GovUkDateComponent,GovUkFieldsetComponent],imports:[CommonModule,ReactiveFormsModule,RpxTranslationModule,GovInputModule],exports:[GovUkDateComponent,GovUkFieldsetComponent]})
export class GovDateModule {}
