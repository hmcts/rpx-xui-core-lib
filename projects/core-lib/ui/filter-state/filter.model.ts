import type { FormGroup } from '@angular/forms';
import type { FilterFieldConfig, FilterPersistence } from '@hmcts/rpx-xui-core-lib/ui/search-location';

export interface FilterConfig {
  id: string;
  fields: FilterFieldConfig[];
  persistence: FilterPersistence;
  applyButtonText: string;
  enableDisabledButton?: boolean;
  cancelButtonText: string;
  cancelSetting?: FilterSetting;
  showCancelFilterButton?: boolean;
  preSelectedNestedCheckbox?: number[];
  cancelButtonCallback?(): void;
  applyButtonCallback?(): void;
  copyFields?(form: FormGroup): FormGroup;
}

export interface FilterSetting {
  id: string;
  ownerHash?: string;
  reset?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published CommonLib filter value contract.
  fields: { name: string; value: any[] }[];
}

export class RadioFilterFieldConfig implements FilterFieldConfig {
  public name: string;
  public options: { key: string; label: string }[];
  public minSelected: 1;
  public maxSelected: 1;
  public type: 'radio';
}

export interface FilterError {
  name: string;
  error: string;
}
