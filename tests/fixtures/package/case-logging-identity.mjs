import assert from 'node:assert/strict';
import '@angular/compiler';
import { StructuredLoggerService } from '@hmcts/rpx-xui-core-lib/case/logging';
import { StructuredLoggerService as NotifierLoggerService } from '@hmcts/rpx-xui-core-lib/case/notifier';

assert.equal(NotifierLoggerService, StructuredLoggerService, 'The logger must keep one class identity across Core entries');
