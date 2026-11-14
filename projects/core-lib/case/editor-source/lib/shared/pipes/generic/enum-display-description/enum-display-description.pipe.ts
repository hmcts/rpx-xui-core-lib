import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'enumDisplayDescription',
  standalone: false
})
export class EnumDisplayDescriptionPipe implements PipeTransform {
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public transform(value: any) {
    return Object.values(value);
  }
}
