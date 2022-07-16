import { DataSource, SelectQueryBuilder } from 'typeorm';
import { migrations } from '../src/migrations';
import { Session, SessionIndex, entities } from '../src/models';
import { getColumn } from "../src/models/fts5";
import {
  Clause,
  parseQueryString,
  clausesEqual,
  IndexToken,
  UnaryOperator,
  BinaryOperator,
  AggregateOperator,
  renderClause,
} from '../src/server/clause';
import { prepareClauseForSearch } from '../src/server/search';

interface TestCase {
  id: string;
  query: string;
  clause: Clause<Session>;
  data: Session[];
  resultIds: string[];
}

function getQuery(dataSource: DataSource, clause: Clause<Session>): [string, Record<string, any>] {
  const getFieldName = (fieldName: string) => {
    if (fieldName === IndexToken) {
      return "session_index";
    }
    return `s.${fieldName}`;
  };

  const preparedClause = prepareClauseForSearch(dataSource, clause);
  console.log('PREPARED', JSON.stringify(clause, null, 2), JSON.stringify(preparedClause, null, 2));
  const [sql, params] = renderClause({
    clause: preparedClause,
    getFieldName,
  });

  return [sql, params];
}

interface TestSessionArgs {
  id: string;
  title?: string;
  url?: string;
}

function testSession({
  id,
  title,
  url,
}: TestSessionArgs): Session {
  if (title === undefined) {
    title = '';
  }
  if (url === undefined) {
    url = '';
  }

  const now = new Date();
  return {
    id,
    title,
    url,
    rawUrl: url,
    startedAt: now,
    lastInteractionAt: now,
    interactionCount: 0,
    tabId: -1,
    childSessions: [],
  };
}

describe(parseQueryString, () => {

  let dataSource: DataSource = {} as any;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities,
      migrations,
      migrationsRun: true,
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.close();
  });

  const examples: TestCase[] = [
    {
      id: 'simple-query',
      query: 'ABC',
      clause: { fieldName: IndexToken, operator: BinaryOperator.Match, value: '"ABC"' },
      data: [
        testSession({ id: 'test1', title: 'ABC123' }),
        testSession({ id: 'test2', url: 'https://google.com/abc' }),
        testSession({ id: 'test3', title: 'blah' })
      ],
      resultIds: ['test1', 'test2']
    },
    {
      id: 'simple-quoted-query',
      query: '"ABC"',
      clause: { fieldName: IndexToken, operator: BinaryOperator.Match, value: '"ABC"' },
      data: [
        testSession({ id: 'test1', title: 'ABC123' }),
        testSession({ id: 'test2', url: 'https://google.com/abc' }),
        testSession({ id: 'test3', title: 'blah' })
      ],
      resultIds: ['test1', 'test2']
    },
    // Queries shorter than 3 characters don't return any results because of the trigram index
    {
      id: '2-letter-query',
      query: 'AB',
      clause: { fieldName: IndexToken, operator: BinaryOperator.Match, value: '"AB"' },
      data: [
        testSession({ id: 'test1', title: 'ABC123' }),
        testSession({ id: 'test2', url: 'https://google.com/abc' }),
        testSession({ id: 'test3', title: 'blah' })
      ],
      resultIds: []
    },
    {
      id: 'and-operator',
      query: 'blah AND google',
      clause: {
        operator: AggregateOperator.And,
        clauses: [
          { fieldName: IndexToken, operator: BinaryOperator.Match, value: '"blah"' },
          { fieldName: IndexToken, operator: BinaryOperator.Match, value: '"google"' },
        ]
      },
      data: [
        testSession({ id: 'test1', title: 'blah google' }),
        testSession({ id: 'test2', url: 'https://google.com/abc', title: 'blah 123' }),
        testSession({ id: 'test3', url: 'https://google.com/blah' }),
        testSession({ id: 'test4', title: 'blah' }),
        testSession({ id: 'test5', title: 'google' }),
      ],
      resultIds: ['test1', 'test2', 'test3']
    },
    {
      id: 'or-operator',
      query: 'blah OR google',
      clause: {
        operator: AggregateOperator.Or,
        clauses: [
          { fieldName: IndexToken, operator: BinaryOperator.Match, value: '"blah"' },
          { fieldName: IndexToken, operator: BinaryOperator.Match, value: '"google"' },
        ]
      },
      data: [
        testSession({ id: 'test1', title: 'blah google' }),
        testSession({ id: 'test2', url: 'https://google.com/abc' }),
        testSession({ id: 'test3', title: 'BLAH' }),
        testSession({ id: 'test4', title: 'crap' }),
        testSession({ id: 'test5', title: 'other' }),
      ],
      resultIds: ['test1', 'test2', 'test3']
    },
    {
      id: 'not-operator',
      query: 'NOT macbook',
      clause: {
        operator: UnaryOperator.Not,
        clause: {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"macbook"'
        },
      },
      data :[
        testSession({ id: 'test1', title: 'blah google' }),
        testSession({ id: 'test2', url: 'https://google.com/abc' }),
        testSession({ id: 'test3', url: 'https://macbook.com' }),
        testSession({ id: 'test4', title: 'some macbook stats' }),
      ],
      resultIds: ['test1', 'test2']
    },
    {
      id: 'not-and-or-1',
      query: 'NOT macbook OR stats',
      clause: {
        operator: AggregateOperator.Or,
        clauses: [
          {
            operator: UnaryOperator.Not,
            clause: {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: '"macbook"'
            },
          },
          {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"stats"'
          }
        ],
      },
      data: [
        testSession({ id: 'test1', title: 'blah google' }),
        testSession({ id: 'test2', url: 'https://google.com/abc' }),
        testSession({ id: 'test3', url: 'https://macbook.com' }),
        testSession({ id: 'test4', title: 'some macbook stats' }),
      ],
      resultIds: ['test1', 'test2', 'test4']
    },
    {
      id: 'not-and-or-2',
      query: 'stats OR NOT macbook',
      clause: {
        operator: AggregateOperator.Or,
        clauses: [
          {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"stats"'
          },
          {
            operator: UnaryOperator.Not,
            clause: {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: '"macbook"'
            },
          },
        ],
      },
      data: [
        testSession({ id: 'test1', title: 'blah google' }),
        testSession({ id: 'test2', url: 'https://google.com/abc' }),
        testSession({ id: 'test3', url: 'https://macbook.com' }),
        testSession({ id: 'test4', title: 'some macbook stats' }),
      ],
      resultIds: ['test1', 'test2', 'test4']
    },
    {
      id: 'and-or-parentheses',
      query: 'stat AND (twitter OR google)',
      clause: {
        operator: AggregateOperator.And,
        clauses: [
          {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"stat"'
          },
          {
            operator: AggregateOperator.Or,
            clauses: [
              {
                operator: BinaryOperator.Match,
                fieldName: IndexToken,
                value: '"twitter"',
              },
              {
                operator: BinaryOperator.Match,
                fieldName: IndexToken,
                value: '"google"',
              }
            ],
          },
        ],
      },
      data: [
        testSession({ id: 'test1', title: 'some macbook stats', url: 'https://twitter.com' }),
        testSession({ id: 'test2', title: 'STATISTICS for dummys', url: 'https://google.com' }),
        testSession({ id: 'test3', url: 'https://google.com', title: 'good restaurants' }),
        testSession({ id: 'test4', url: 'https://twitter.com', title: 'New Tweets' }),
        testSession({ id: 'test5', url: 'https://stats.com', title: 'statistics' }),
      ],
      resultIds: ['test1', 'test2']
    },
    {
      id: 'and-or-not-parentheses-1',
      query: 'stat AND NOT (twitter OR google)',
      clause: {
        operator: AggregateOperator.And,
        clauses: [
          {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"stat"'
          },
          {
            operator: UnaryOperator.Not,
            clause: {
              operator: AggregateOperator.Or,
              clauses: [
                {
                  operator: BinaryOperator.Match,
                  fieldName: IndexToken,
                  value: '"twitter"',
                },
                {
                  operator: BinaryOperator.Match,
                  fieldName: IndexToken,
                  value: '"google"',
                }
              ],
            },
          },
        ],
      },
      data: [
        testSession({ id: 'test1', title: 'some macbook stats', url: 'https://twitter.com' }),
        testSession({ id: 'test2', title: 'STATISTICS for dummys', url: 'https://google.com' }),
        testSession({ id: 'test3', url: 'https://google.com', title: 'good restaurants' }),
        testSession({ id: 'test4', url: 'https://twitter.com', title: 'New Tweet' }),
        testSession({ id: 'test5', url: 'https://stats.com', title: 'statistics' }),
      ],
      resultIds: ['test5']
    },
    {
      id: 'and-or-not-parentheses-2',
      query: '(stat OR blue) AND NOT (twitter OR google)',
      clause: {
        operator: AggregateOperator.And,
        clauses: [
          {
            operator: AggregateOperator.Or,
            clauses: [
              {
                operator: BinaryOperator.Match,
                fieldName: IndexToken,
                value: '"stat"'
              },
              {
                operator: BinaryOperator.Match,
                fieldName: IndexToken,
                value: '"blue"',
              }
            ]
          },
          {
            operator: UnaryOperator.Not,
            clause: {
              operator: AggregateOperator.Or,
              clauses: [
                {
                  operator: BinaryOperator.Match,
                  fieldName: IndexToken,
                  value: '"twitter"',
                },
                {
                  operator: BinaryOperator.Match,
                  fieldName: IndexToken,
                  value: '"google"',
                }
              ],
            },
          },
        ],
      },
      data: [
        testSession({ id: 'test1', title: 'some blue macbook stats', url: 'https://twitter.com' }),
        testSession({ id: 'test2', title: 'STATISTICS for dummys', url: 'https://google.com' }),
        testSession({ id: 'test3', url: 'https://google.com', title: 'good restaurants' }),
        testSession({ id: 'test4', url: 'https://twitter.com', title: 'New Tweet' }),
        testSession({ id: 'test5', url: 'https://stats.com', title: 'statistics' }),
        testSession({ id: 'test6', url: 'https://blue.com' }),
      ],
      resultIds: ['test5', 'test6']
    },
    {
      id: 'field-query-1',
      query: 'url:blue',
      clause: {
        operator: BinaryOperator.Equals,
        fieldName: 'url',
        value: 'blue',
      },
      data: [
        testSession({ id: 'test1', url: 'https://blue.com' }),
        testSession({ id: 'test2', url: 'https://bluprint.com', title: 'Red and yellow' }),
        testSession({ id: 'test3', title: 'Blue shirts are fun!' }),
      ],
      resultIds: ['test1']
    }
  ];

  const parseExamples: [string, string, Clause<Session>][] = examples.map((example) => {
    return [example.id, example.query, example.clause];
  });

  it.each(parseExamples)('%s: parse: %s = %s', (id: string, queryString: string, expected: Clause<Session>) => {
    const result = parseQueryString<Session>(queryString);
    // console.log('RESULT', result, expected);
    expect(clausesEqual(result, expected)).toBe(true);
  });

  const runExamples: [string, string, string[], Session[]][] = examples.map((example) => {
    return [example.id, example.query, example.resultIds, example.data];
  });

  it.each(runExamples)('%s: run: %s -> %s', async (id: string, queryString: string, resultIds: string[], data: Session[]) => {
    // Run each example in a transaction, that way no need to do any additional cleanup between tests
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = parseQueryString<Session>(queryString);
      const [sql, params] = getQuery(dataSource, result);

      const sessionRepo = queryRunner.manager.getRepository(Session);

      await sessionRepo.createQueryBuilder()
        .insert()
        .values(data)
        .execute();

      const indexRepo = queryRunner.manager.getRepository(SessionIndex);

      const builder = indexRepo
        .createQueryBuilder("s")
        .select('id')
        .where(sql, params);

      const rows = await builder.getRawMany();
      expect(new Set(rows.map((row) => row.id))).toStrictEqual(new Set(resultIds));
    } finally {
      await queryRunner.rollbackTransaction();
    }
  });

});
