import { Pipe, PipeTransform } from '@angular/core';
import { Draft, DRAFT_PREFIX } from '@hmcts/rpx-xui-core-lib/case/models';

@Pipe({
  name: 'ccdCaseReference',
  standalone: false
})
export class CaseReferencePipe implements PipeTransform {

  public transform(caseReference: string): string {
    if (!caseReference) {
      return '';
    }
    if (Draft.isDraft(caseReference)) {
      return DRAFT_PREFIX;
    } else {
      const regex = /(?:\/)?(\d{4})(\d{4})(\d{4})(\d{4})/g;
      const result = String(caseReference).replace(regex, (match,
        g1, g2, g3, g4) => {
          const isLink = match[0] === '/';
          if (isLink) {
            return match;
          }

          return [g1, g2, g3, g4].join('-');
      });

      return result;
    }
  }
}
