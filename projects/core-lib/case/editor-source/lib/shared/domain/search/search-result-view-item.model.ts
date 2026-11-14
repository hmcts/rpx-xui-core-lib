// tslint:disable:variable-name
import { Type } from 'class-transformer';
import { CaseField } from '../definition';

// @dynamic
export class SearchResultViewItem {
  public case_id: string;
  public case_fields: object;
  @Type(() => CaseField)
  public hydrated_case_fields?: CaseField[];
  public columns?: object;
  // Preserve the Toolkit public contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public supplementary_data?: any;
  // Preserve the Toolkit public contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public display_context_parameter?: any;
}
