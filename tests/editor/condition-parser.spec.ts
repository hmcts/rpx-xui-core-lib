import parser from '../../projects/core-lib/case/editor-source/lib/shared/directives/conditional-show/services/condition.peg';
import { conditionParser } from '@hmcts/rpx-xui-core-lib/case/notifier';
import { ConditionParser } from '../../projects/core-lib/case/editor-source/lib/shared/directives/conditional-show/services/condition-parser.service';

export const registered = true;

describe('Condition parser migration contract', () => {
  it('preserves the parser default export across entry points', () => {
    expect(parser).toBe(conditionParser);
    expect(parser.parse('parent.child=\"yes\"', {})).toBeDefined();
  });
  it('evaluates nested fields and missing values', () => {
    const condition = ConditionParser.parse('parent.child="yes"');
    expect(ConditionParser.evaluate({ parent: { child: 'yes' } }, condition)).toBeTrue();
    expect(ConditionParser.evaluate({ parent: { child: 'no' } }, condition)).toBeFalse();
    expect(ConditionParser.evaluate({}, condition)).toBeFalse();
  });

  it('evaluates collection paths and dynamic lists', () => {
    const condition = ConditionParser.parse('items.choice="A"');
    const fields = { items: [{ value: { choice: { value: { code: 'A' }, list_items: [] as unknown[] } } }, { value: { choice: { value: { code: 'B' }, list_items: [] as unknown[] } } }] };
    expect(ConditionParser.evaluate(fields, condition, 'items_0')).toBeTrue();
    expect(ConditionParser.evaluate(fields, condition, 'items_1')).toBeFalse();
  });
});
