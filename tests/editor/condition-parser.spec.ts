import { describe, expect, it } from 'vitest';
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
    expect(ConditionParser.evaluate({ parent: { child: 'yes' } }, condition)).toBe(true);
    expect(ConditionParser.evaluate({ parent: { child: 'no' } }, condition)).toBe(false);
    expect(ConditionParser.evaluate({}, condition)).toBe(false);
  });

  it('evaluates collection paths and dynamic lists', () => {
    const condition = ConditionParser.parse('items.choice="A"');
    const fields = { items: [{ value: { choice: { value: { code: 'A' }, list_items: [] as unknown[] } } }, { value: { choice: { value: { code: 'B' }, list_items: [] as unknown[] } } }] };
    expect(ConditionParser.evaluate(fields, condition, 'items_0')).toBe(true);
    expect(ConditionParser.evaluate(fields, condition, 'items_1')).toBe(false);
  });
  it('matches multi-select values using the existing code-unit ordering', () => {
    const values = ['beta', 'alpha', 'Zeta'];
    const condition = ConditionParser.parse('choices="beta,alpha,Zeta"');
    expect(ConditionParser.evaluate({ choices: values }, condition)).toBe(true);
    expect(values).toEqual(['Zeta', 'alpha', 'beta']);
    expect(ConditionParser.evaluate({ choices: values }, ConditionParser.parse('choices CONTAINS \"beta,Zeta\"'))).toBe(true);
    expect(ConditionParser.evaluate({ choices: values }, ConditionParser.parse('choices CONTAINS \"beta,missing\"'))).toBe(false);
  });

});
