/* istanbul ignore file */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rpxTranslate',
  standalone: false
})
export class MockRpxTranslatePipe implements PipeTransform {
    // Match the real translation pipe signature in tests.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public transform(value: string, _replacements?: { [key: string]: string } | null, _yesOrNo?: string): string {
        return value;
    }
}
