import {
  Clause,
  parseQueryString,
  clausesEqual,
  IndexToken,
  BinaryOperator,
  AggregateOperator
} from '../src/server/clause';
import { Session } from '../src/models';

describe(parseQueryString, () => {

  const examples: [string, Clause<Session>][] = [
    ['ABC', { fieldName: IndexToken, operator: BinaryOperator.Match, value: 'ABC' }]
  ];

  it.each(examples)('parse: %s = %s', (queryString: string, expected: Clause<Session>) => {
    expect(clausesEqual(parseQueryString<Session>(queryString), expected)).toBe(true);
  });

});
