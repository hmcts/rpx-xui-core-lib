import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FilterService } from '@hmcts/rpx-xui-core-lib/ui/filter-state';
declare global { interface Window { filterProbe: FilterService; } }
@Component({ selector: 'core-filter-state-host', template: '<main><h1>Filter state test host</h1></main>' })
class FilterGallery {}
export function startFilterGallery() {
  return bootstrapApplication(FilterGallery).then(app => { window.filterProbe = app.injector.get(FilterService); });
}
