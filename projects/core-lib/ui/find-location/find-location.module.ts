import { NgModule } from '@angular/core';
import { SearchLocationModule } from '@hmcts/rpx-xui-core-lib/ui/search-location';
import { FindLocationComponent } from './find-location.component';

@NgModule({ declarations: [FindLocationComponent], imports: [SearchLocationModule], exports: [FindLocationComponent] })
export class FindLocationModule {}
