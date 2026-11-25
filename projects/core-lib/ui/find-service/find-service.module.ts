import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SearchServiceModule } from '@hmcts/rpx-xui-core-lib/ui/search-service';
import { FindServiceComponent } from './find-service.component';

@NgModule({ declarations: [FindServiceComponent], imports: [RpxTranslationModule, SearchServiceModule], exports: [FindServiceComponent] })
export class FindServiceModule {}
