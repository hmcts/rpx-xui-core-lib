// tslint:disable:variable-name
import { FieldType } from '../definition';

export class Field {
  declare public display_context_parameter?: string;

  constructor(
    public id: string,
    public field_type: FieldType,
    public elementPath?: string,
    public value?: string,
    public label?: string,
    public metadata?: boolean
  ) {}
}
