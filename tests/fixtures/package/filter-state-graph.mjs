import { FilterService, RadioFilterFieldConfig } from '@hmcts/rpx-xui-core-lib/ui/filter-state';

/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterPersistence} */
const persistence = 'memory';
/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterConfigOption} */
const option = { key: 'applications', label: 'Applications' };
/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterFieldOption} */
const fieldOption = { ...option, selectAll: true };
/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').GroupOptions} */
const group = { group: 'Work', options: [fieldOption] };
/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterFieldConfig} */
const field = { ...new RadioFilterFieldConfig(), options: [option], groupOptions: [group] };
/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterConfig} */
const config = { id: 'sample-filter', fields: [field], persistence, applyButtonText: 'Apply', cancelButtonText: 'Cancel' };
/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterSetting} */
const setting = { id: config.id, fields: [] };
/** @type {import('@hmcts/rpx-xui-core-lib/ui/filter-state').FilterError[]} */
const errors = [];

const service = new FilterService();
service.givenErrors.next(errors);
service.persist(setting, config.persistence);
console.log(service.get(setting.id), config);
