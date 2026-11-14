import { FormatTranslatorService } from '../../projects/core-lib/case/editor-source/lib/shared/services/case-fields/format-translator.service';

export const registered = true;

describe('FormatTranslatorService migration contract', () => {
  const service = new FormatTranslatorService();

  it('translates date tokens and preserves literal handling', () => {
    expect(service.translate("yyyy-MM-dd 'at' HH:mm")).toBe('YYYY-MM-DD  HH:mm');
    expect(service.showOnlyDates('yyyy-MM-dd')).toBe('YYYY-MM-DD');
  });

  it('marks unsupported nanosecond tokens', () => {
    expect(service.translate('nN')).toBe('***n******N***');
  });
});
