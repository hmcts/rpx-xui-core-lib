import type { BookingCheckType } from '@hmcts/rpx-xui-core-lib/reference/locations';
import type { PersonRole } from './person-role';

export type FilterFieldType = 'group-title' | 'checkbox' | 'radio' | 'select' | 'find-person' | 'find-location' | 'find-work-type' | 'checkbox-large' | 'find-service' | 'text-input' | 'email-input' | 'group-select' | 'nested-checkbox' | 'find-task-name';

export type FilterPersistence = 'local' | 'session' | 'memory';

export interface FilterConfigOption {
  key: string;
  label: string;
  selectAll?: boolean;
}

export interface FilterFieldOption {
  key: string;
  label: string;
  selectAll?: true;
}

export interface FilterFieldConfig {
  name: string;
  options: FilterConfigOption[];
  minSelected: number;
  maxSelected: number;
  type: FilterFieldType;
  minSelectedError?: string;
  maxSelectedError?: string;
  displayMaxSelectedError?: boolean;
  displayMinSelectedError?: boolean;
  emailError?: string;
  lineBreakBefore?: boolean;
  showCondition?: string;
  enableCondition?: string;
  enableAddButton?: boolean;
  enableAddLocationButton?: boolean;
  enableAddTaskNameButton?: boolean;
  changeResetFields?: string[];
  findPersonField?: string;
  findLocationField?: string;
  findTaskNameField?: string;
  findWorkTypeField?: string;
  domainField?: string;
  disable?: boolean;
  disabledText?: string;
  domain?: PersonRole;
  title?: string;
  titleClasses?: string;
  titleHint?: string;
  subTitle?: string;
  locationTitle?: string;
  workTypeTitle?: string;
  hintText?: string;
  radioSelectionChange?: string;
  bookingCheckType?: BookingCheckType;
  placeholderContent?: string;
  maxWidth480px?: boolean;
  maxRows?: number;
  groupOptions?: GroupOptions[];
  maxlength?: number;
  defaultOption?: FilterConfigOption;
  readonly?: boolean;
  servicesField?: string;
  services?: string[];
  propertyNameFilter?: string;
}

export interface GroupOptions {
  group: string;
  options: FilterFieldOption[];
  placeholderContent?: string;
}
