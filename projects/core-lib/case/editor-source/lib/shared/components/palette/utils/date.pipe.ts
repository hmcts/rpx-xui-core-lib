import { Pipe } from '@angular/core';
import { DateFormatter, FormatTranslatorService } from '@hmcts/rpx-xui-core-lib/case/notifier';

@Pipe({ name: 'ccdDate', standalone: false })
export class DatePipe extends DateFormatter {
  constructor(formatTrans: FormatTranslatorService) {
    super(formatTrans);
  }
}
