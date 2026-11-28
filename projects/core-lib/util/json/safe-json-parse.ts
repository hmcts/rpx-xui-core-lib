import { StructuredLoggerService } from '@hmcts/rpx-xui-core-lib/case/logging';

const logger = new StructuredLoggerService();

export function safeJsonParse<T>(value: string | null, fallback: T | null = null): T | null {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('safeJsonParse failed to parse JSON.', {
      errorName: error instanceof Error ? error.name : 'UnknownError'
    });
    return fallback;
  }
}
