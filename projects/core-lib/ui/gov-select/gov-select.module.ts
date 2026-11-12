import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {RpxTranslationModule} from '@hmcts/rpx-xui-core-lib/i18n';
import {GovInputModule} from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import {GovUkSelectComponent} from './gov-uk-select/gov-uk-select.component';
@NgModule({declarations:[GovUkSelectComponent],imports:[CommonModule,ReactiveFormsModule,RpxTranslationModule,GovInputModule],exports:[GovUkSelectComponent]})
export class GovSelectModule {}
