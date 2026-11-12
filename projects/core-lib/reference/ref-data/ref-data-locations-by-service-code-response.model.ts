import { LocationModel } from '@hmcts/rpx-xui-core-lib/reference/locations';

export interface LocationModelsByServiceCodeResponse {
  court_type: string;
  court_type_id: string;
  court_venues: LocationModel[];
  service_code: string;
  welsh_court_type: string;
}
