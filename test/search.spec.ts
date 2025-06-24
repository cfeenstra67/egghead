import { expect, test } from "vitest";
import type { Session } from "../src/models";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
  IndexToken,
  UnaryOperator,
  clausesEqual,
  parseQueryString,
} from "../src/server/clause.js";

type SessionInput = Omit<Session, "childSessions">;

interface TestCase {
  id: string;
  query: string;
  clause: Clause<Session>;
  data: SessionInput[];
  resultIds: string[];
}

interface TestSessionArgs {
  id: string;
  title?: string;
  url?: string;
  interactionCount?: number;
  tabId?: number;
  startedAt?: Date;
  endedAt?: Date;
  lastInteractionAt?: Date;
}

function testSession({
  id,
  title,
  url,
  interactionCount,
  tabId,
  startedAt,
  endedAt,
  lastInteractionAt,
}: TestSessionArgs): SessionInput {
  const now = new Date();
  return {
    id,
    title: title ?? "",
    url: url ?? "",
    rawUrl: url ?? "",
    startedAt: startedAt ?? now,
    endedAt: endedAt ?? null,
    lastInteractionAt: lastInteractionAt ?? now,
    interactionCount: interactionCount ?? 0,
    tabId: tabId ?? -1,
    host: url ? new URL(url).hostname : "",
  } as SessionInput;
}

const examples: TestCase[] = [
  {
    id: "simple-query",
    query: "ABC",
    clause: {
      fieldName: IndexToken,
      operator: BinaryOperator.Match,
      value: '"ABC"',
    },
    data: [
      testSession({ id: "test1", title: "ABC123" }),
      testSession({ id: "test2", url: "https://google.com/abc" }),
      testSession({ id: "test3", title: "blah" }),
    ],
    resultIds: ["test1", "test2"],
  },
  {
    id: "simple-quoted-query",
    query: '"ABC"',
    clause: {
      fieldName: IndexToken,
      operator: BinaryOperator.Match,
      value: '"ABC"',
    },
    data: [
      testSession({ id: "test1", title: "ABC123" }),
      testSession({ id: "test2", url: "https://google.com/abc" }),
      testSession({ id: "test3", title: "blah" }),
    ],
    resultIds: ["test1", "test2"],
  },
  // Queries shorter than 3 characters don't return any results because of the trigram index
  {
    id: "2-letter-query",
    query: "AB",
    clause: {
      fieldName: IndexToken,
      operator: BinaryOperator.Match,
      value: '"AB"',
    },
    data: [
      testSession({ id: "test1", title: "ABC123" }),
      testSession({ id: "test2", url: "https://google.com/abc" }),
      testSession({ id: "test3", title: "blah" }),
    ],
    resultIds: [],
  },
  {
    id: "and-operator",
    query: "blah AND google",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          fieldName: IndexToken,
          operator: BinaryOperator.Match,
          value: '"blah"',
        },
        {
          fieldName: IndexToken,
          operator: BinaryOperator.Match,
          value: '"google"',
        },
      ],
    },
    data: [
      testSession({ id: "test1", title: "blah google" }),
      testSession({
        id: "test2",
        url: "https://google.com/abc",
        title: "blah 123",
      }),
      testSession({ id: "test3", url: "https://google.com/blah" }),
      testSession({ id: "test4", title: "blah" }),
      testSession({ id: "test5", title: "google" }),
    ],
    resultIds: ["test1", "test2", "test3"],
  },
  {
    id: "or-operator",
    query: "blah OR google",
    clause: {
      operator: AggregateOperator.Or,
      clauses: [
        {
          fieldName: IndexToken,
          operator: BinaryOperator.Match,
          value: '"blah"',
        },
        {
          fieldName: IndexToken,
          operator: BinaryOperator.Match,
          value: '"google"',
        },
      ],
    },
    data: [
      testSession({ id: "test1", title: "blah google" }),
      testSession({ id: "test2", url: "https://google.com/abc" }),
      testSession({ id: "test3", title: "BLAH" }),
      testSession({ id: "test4", title: "crap" }),
      testSession({ id: "test5", title: "other" }),
    ],
    resultIds: ["test1", "test2", "test3"],
  },
  {
    id: "not-operator",
    query: "NOT macbook",
    clause: {
      operator: UnaryOperator.Not,
      clause: {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: '"macbook"',
      },
    },
    data: [
      testSession({ id: "test1", title: "blah google" }),
      testSession({ id: "test2", url: "https://google.com/abc" }),
      testSession({ id: "test3", url: "https://macbook.com" }),
      testSession({ id: "test4", title: "some macbook stats" }),
    ],
    resultIds: ["test1", "test2"],
  },
  {
    id: "not-and-or-1",
    query: "NOT macbook OR stats",
    clause: {
      operator: AggregateOperator.Or,
      clauses: [
        {
          operator: UnaryOperator.Not,
          clause: {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"macbook"',
          },
        },
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"stats"',
        },
      ],
    },
    data: [
      testSession({ id: "test1", title: "blah google" }),
      testSession({ id: "test2", url: "https://google.com/abc" }),
      testSession({ id: "test3", url: "https://macbook.com" }),
      testSession({ id: "test4", title: "some macbook stats" }),
    ],
    resultIds: ["test1", "test2", "test4"],
  },
  {
    id: "not-and-or-2",
    query: "stats OR NOT macbook",
    clause: {
      operator: AggregateOperator.Or,
      clauses: [
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"stats"',
        },
        {
          operator: UnaryOperator.Not,
          clause: {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"macbook"',
          },
        },
      ],
    },
    data: [
      testSession({ id: "test1", title: "blah google" }),
      testSession({ id: "test2", url: "https://google.com/abc" }),
      testSession({ id: "test3", url: "https://macbook.com" }),
      testSession({ id: "test4", title: "some macbook stats" }),
    ],
    resultIds: ["test1", "test2", "test4"],
  },
  {
    id: "and-or-parentheses",
    query: "stat AND (twitter OR google)",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"stat"',
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
            },
          ],
        },
      ],
    },
    data: [
      testSession({
        id: "test1",
        title: "some macbook stats",
        url: "https://twitter.com",
      }),
      testSession({
        id: "test2",
        title: "STATISTICS for dummys",
        url: "https://google.com",
      }),
      testSession({
        id: "test3",
        url: "https://google.com",
        title: "good restaurants",
      }),
      testSession({
        id: "test4",
        url: "https://twitter.com",
        title: "New Tweets",
      }),
      testSession({
        id: "test5",
        url: "https://stats.com",
        title: "statistics",
      }),
    ],
    resultIds: ["test1", "test2"],
  },
  {
    id: "and-or-not-parentheses-1",
    query: "stat AND NOT (twitter OR google)",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"stat"',
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
              },
            ],
          },
        },
      ],
    },
    data: [
      testSession({
        id: "test1",
        title: "some macbook stats",
        url: "https://twitter.com",
      }),
      testSession({
        id: "test2",
        title: "STATISTICS for dummys",
        url: "https://google.com",
      }),
      testSession({
        id: "test3",
        url: "https://google.com",
        title: "good restaurants",
      }),
      testSession({
        id: "test4",
        url: "https://twitter.com",
        title: "New Tweet",
      }),
      testSession({
        id: "test5",
        url: "https://stats.com",
        title: "statistics",
      }),
    ],
    resultIds: ["test5"],
  },
  {
    id: "and-or-not-parentheses-2",
    query: "(stat OR blue) AND NOT (twitter OR google)",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          operator: AggregateOperator.Or,
          clauses: [
            {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: '"stat"',
            },
            {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: '"blue"',
            },
          ],
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
              },
            ],
          },
        },
      ],
    },
    data: [
      testSession({
        id: "test1",
        title: "some blue macbook stats",
        url: "https://twitter.com",
      }),
      testSession({
        id: "test2",
        title: "STATISTICS for dummys",
        url: "https://google.com",
      }),
      testSession({
        id: "test3",
        url: "https://google.com",
        title: "good restaurants",
      }),
      testSession({
        id: "test4",
        url: "https://twitter.com",
        title: "New Tweet",
      }),
      testSession({
        id: "test5",
        url: "https://stats.com",
        title: "statistics",
      }),
      testSession({ id: "test6", url: "https://blue.com" }),
    ],
    resultIds: ["test5", "test6"],
  },
  {
    id: "field-query-1",
    query: "url:blue",
    clause: {
      operator: BinaryOperator.Equals,
      fieldName: "url",
      value: "blue",
    },
    data: [
      testSession({ id: "test1", url: "https://blue.com" }),
      testSession({
        id: "test2",
        url: "https://bluprint.com",
        title: "Red and yellow",
      }),
      testSession({ id: "test3", title: "Blue shirts are fun!" }),
    ],
    resultIds: ["test1"],
  },
  {
    id: "field-query-with-or",
    query: "url:blue OR title:green",
    clause: {
      operator: AggregateOperator.Or,
      clauses: [
        {
          operator: BinaryOperator.Equals,
          fieldName: "url",
          value: "blue",
        },
        {
          operator: BinaryOperator.Equals,
          fieldName: "title",
          value: "green",
        },
      ],
    },
    data: [
      testSession({ id: "test1", url: "https://blue.com" }),
      testSession({
        id: "test2",
        url: "https://bluprint.com",
        title: "Red and green",
      }),
      testSession({ id: "test3", title: "Blue shirts are fun!" }),
    ],
    resultIds: ["test1", "test2"],
  },
  {
    id: "complex-query-1",
    query: "NOT (url:blue OR title:green) OR (google AND search)",
    clause: {
      operator: AggregateOperator.Or,
      clauses: [
        {
          operator: UnaryOperator.Not,
          clause: {
            operator: AggregateOperator.Or,
            clauses: [
              {
                operator: BinaryOperator.Equals,
                fieldName: "url",
                value: "blue",
              },
              {
                operator: BinaryOperator.Equals,
                fieldName: "title",
                value: "green",
              },
            ],
          },
        },
        {
          operator: AggregateOperator.And,
          clauses: [
            {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: '"google"',
            },
            {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: '"search"',
            },
          ],
        },
      ],
    },
    data: [
      testSession({
        id: "test1",
        url: "https://google.com/blue",
        title: "Search",
      }),
      testSession({ id: "test2", url: "https://bluprint.com", title: "Red" }),
      testSession({
        id: "test3",
        title: "Blue shirts are fun!",
        url: "https://blue.com",
      }),
      testSession({ id: "test4", title: "Green 123" }),
      testSession({ id: "test5", url: "https://google.com/blue" }),
      testSession({ id: "test6", url: "https://search.com/blue" }),
      testSession({ id: "test7", title: "Green Search" }),
    ],
    resultIds: ["test1", "test2"],
  },
  {
    id: "date-lt-1",
    query: "startedAt:lt:2022-07-01",
    clause: {
      operator: BinaryOperator.LessThan,
      fieldName: "startedAt",
      value: "2022-07-01",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test1", "test4", "test5", "test6"],
  },
  {
    id: "date-le-1",
    query: "startedAt:le:2022-07-01",
    clause: {
      operator: BinaryOperator.LessthanOrEqualTo,
      fieldName: "startedAt",
      value: "2022-07-01",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test1", "test2", "test4", "test5", "test6"],
  },
  {
    id: "date-gt-1",
    query: "startedAt:gt:2022-07-01",
    clause: {
      operator: BinaryOperator.GreaterThan,
      fieldName: "startedAt",
      value: "2022-07-01",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test3"],
  },
  {
    id: "date-ge-1",
    query: "startedAt:ge:2022-07-01",
    clause: {
      operator: BinaryOperator.GreaterThanOrEqualTo,
      fieldName: "startedAt",
      value: "2022-07-01",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test2", "test3"],
  },
  {
    id: "date-eq-1",
    query: "startedAt:2022-07-01",
    clause: {
      operator: BinaryOperator.Equals,
      fieldName: "startedAt",
      value: "2022-07-01",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test2"],
  },
  {
    id: "date-eq-2",
    query: "startedAt:eq:7/1/2022",
    clause: {
      operator: BinaryOperator.Equals,
      fieldName: "startedAt",
      value: "7/1/2022",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test2"],
  },
  {
    id: "date-ne-1",
    query: "startedAt:ne:2022/07/01",
    clause: {
      operator: BinaryOperator.NotEquals,
      fieldName: "startedAt",
      value: "2022/07/01",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test1", "test3", "test4", "test5", "test6"],
  },
  {
    id: "date-time-ne-1",
    query: 'startedAt:ne:"2022-07-01 00:00:00"',
    clause: {
      operator: BinaryOperator.NotEquals,
      fieldName: "startedAt",
      value: "2022-07-01 00:00:00",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test1", "test3", "test4", "test5", "test6"],
  },
  {
    id: "date-time-ne-2",
    query: "startedAt:ne:2022-07-01T00:00:00",
    clause: {
      operator: BinaryOperator.NotEquals,
      fieldName: "startedAt",
      value: "2022-07-01T00:00:00",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 5, 1) }),
      testSession({ id: "test2", startedAt: new Date(2022, 6, 1) }),
      testSession({ id: "test3", startedAt: new Date(2022, 6, 2) }),
      testSession({ id: "test4", startedAt: new Date(2022, 0, 1) }),
      testSession({ id: "test5", startedAt: new Date(2021, 6, 13) }),
      testSession({
        id: "test6",
        startedAt: new Date(2022, 5, 30, 23, 59, 59),
      }),
    ],
    resultIds: ["test1", "test3", "test4", "test5", "test6"],
  },
  {
    id: "date-time-gt-1",
    query: "startedAt:gt:2022/05/01T12:30:51",
    clause: {
      operator: BinaryOperator.GreaterThan,
      fieldName: "startedAt",
      value: "2022/05/01T12:30:51",
    },
    data: [
      testSession({ id: "test1", startedAt: new Date(2022, 4, 1, 12, 30, 51) }),
      testSession({ id: "test2", startedAt: new Date(2022, 4, 1, 12, 30, 52) }),
    ],
    resultIds: ["test2"],
  },
  {
    id: "complex-query-with-fields-1",
    query:
      "twitter AND (startedAt:lt:7/1/2022 OR blah) NOT (google2 OR host:google.com)",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          operator: AggregateOperator.And,
          clauses: [
            {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: '"twitter"',
            },
            {
              operator: AggregateOperator.Or,
              clauses: [
                {
                  operator: BinaryOperator.LessThan,
                  fieldName: "startedAt",
                  value: "7/1/2022",
                },
                {
                  operator: BinaryOperator.Match,
                  fieldName: IndexToken,
                  value: '"blah"',
                },
              ],
            },
          ],
        },
        {
          operator: UnaryOperator.Not,
          clause: {
            operator: AggregateOperator.Or,
            clauses: [
              {
                operator: BinaryOperator.Match,
                fieldName: IndexToken,
                value: '"google2"',
              },
              {
                operator: BinaryOperator.Equals,
                fieldName: "host",
                value: "google.com",
              },
            ],
          },
        },
      ],
    },
    data: [
      testSession({
        id: "test1",
        url: "https://google.com",
        title: "twitter blah",
      }),
      testSession({
        id: "test2",
        title: "twitter",
        startedAt: new Date(2022, 5, 30),
      }),
      testSession({ id: "test3", title: "twitter blah" }),
      testSession({ id: "test4", title: "twitter blah google2" }),
      testSession({
        id: "test5",
        title: "twitter",
        startedAt: new Date(2022, 6, 2),
      }),
    ],
    resultIds: ["test2", "test3"],
  },
  {
    id: "multi-1",
    query: "twitter google",
    clause: {
      operator: AggregateOperator.And,
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
        },
      ],
    },
    data: [],
    resultIds: [],
  },
  {
    id: "parentheses-single-1",
    query: "(twitter)",
    clause: {
      operator: BinaryOperator.Match,
      fieldName: IndexToken,
      value: '"twitter"',
    },
    data: [],
    resultIds: [],
  },
  {
    id: "parentheses-multi-1",
    query: "(twitter google NOT USA)",
    clause: {
      operator: AggregateOperator.And,
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
        },
        {
          operator: UnaryOperator.Not,
          clause: {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"USA"',
          },
        },
      ],
    },
    data: [],
    resultIds: [],
  },
  {
    id: "unclosed-parentheses-1",
    query: "(hello",
    clause: {
      operator: BinaryOperator.Match,
      fieldName: IndexToken,
      value: '"hello"',
    },
    data: [],
    resultIds: [],
  },
  {
    id: "empty-1",
    query: "",
    clause: {
      operator: AggregateOperator.And,
      clauses: [],
    },
    data: [testSession({ id: "test1" })],
    resultIds: ["test1"],
  },
  {
    id: "empty-unclosed-parentheses-1",
    query: "(",
    clause: {
      operator: AggregateOperator.And,
      clauses: [],
    },
    data: [testSession({ id: "test1" })],
    resultIds: ["test1"],
  },
  {
    id: "empty-closed-parentheses-1",
    query: "()",
    clause: {
      operator: AggregateOperator.And,
      clauses: [],
    },
    data: [testSession({ id: "test1" })],
    resultIds: ["test1"],
  },
  {
    id: "non-field-1",
    query: "someField:123",
    clause: {
      operator: BinaryOperator.Equals,
      fieldName: "someField" as any,
      value: "123",
    },
    data: [
      testSession({ id: "test1" }),
      testSession({ id: "test2", title: "someField:123" }),
    ],
    resultIds: ["test2"],
  },
  {
    id: "not-non-field-1",
    query: "NoT someField:123",
    clause: {
      operator: UnaryOperator.Not,
      clause: {
        operator: BinaryOperator.Equals,
        fieldName: "someField" as any,
        value: "123",
      },
    },
    data: [
      testSession({ id: "test1" }),
      testSession({ id: "test2", title: "someField:123" }),
    ],
    resultIds: ["test1"],
  },
  {
    id: "number-1",
    query: "interactionCount:gt:0",
    clause: {
      operator: BinaryOperator.GreaterThan,
      fieldName: "interactionCount",
      value: "0",
    },
    data: [
      testSession({ id: "test1", interactionCount: 1 }),
      testSession({ id: "test2" }),
    ],
    resultIds: ["test1"],
  },
  {
    id: "quote-parentheses-1",
    query: '"(hello \\" my name is cam)"',
    clause: {
      operator: BinaryOperator.Match,
      fieldName: IndexToken,
      value: '"(hello "" my name is cam)"',
    },
    data: [],
    resultIds: [],
  },
  {
    id: "and-like-word-1",
    query: "andrew long",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"andrew"',
        },
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"long"',
        },
      ],
    },
    data: [],
    resultIds: [],
  },
  {
    id: "or-like-word-1",
    query: "order and ordinance",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"order"',
        },
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"ordinance"',
        },
      ],
    },
    data: [],
    resultIds: [],
  },
  {
    id: "not-like-word-1",
    query: "notebook abc not blah",
    clause: {
      operator: AggregateOperator.And,
      clauses: [
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"notebook"',
        },
        {
          operator: BinaryOperator.Match,
          fieldName: IndexToken,
          value: '"abc"',
        },
        {
          operator: UnaryOperator.Not,
          clause: {
            operator: BinaryOperator.Match,
            fieldName: IndexToken,
            value: '"blah"',
          },
        },
      ],
    },
    data: [],
    resultIds: [],
  },
];

for (const {
  id,
  query: queryString,
  clause: expected,
  resultIds,
  data,
} of examples) {
  test(`${id}: parse: ${queryString} = ${expected}`, () => {
    const result = parseQueryString<Session>(queryString);
    expect(clausesEqual(result, expected)).toBe(true);
  });

  test(`${id}: run: ${queryString} -> ${resultIds}`, async () => {});
}

// async function useDatabase<T>(use: (conn: SQLConnection) => Promise<T>): Promise<T> {
//   const db = new Database();

//   const conn = (async (query, params) => {
//     let prepared = db.prepare(query)
//     if (params && params.length > 0) {
//       const p: any[] = [];
//       for (const item of params) {
//         if (item instanceof Date) {
//           p.push(item.toISOString());
//         } else {
//           p.push(item);
//         }
//       }
//       prepared = prepared.bind(p);
//     }
//     const out: any[] = [];
//     let colNames: string[];
//     try {
//       const cols = prepared.columns();
//       colNames = cols.map((c) => c.name);
//     } catch (error) {
//       prepared.run();
//       return [];
//     }
//     for (const row of prepared.all()) {
//       out.push(Object.fromEntries(colNames.map((col, idx) => [col, (row as any[])[idx]])));
//     }
//     return out;
//   }) as SQLConnection;

//   conn.close = async () => { db.close() };

//   try {
//     await executeDdl(conn);

//     return await use(conn);
//   } finally {
//     conn.close();
//   }
// }

// describe(SearchService, () => {
//   const runExamples: [string, string, string[], SessionInput[]][] = examples.map((example) => {
//     return [example.id, example.query, example.resultIds, example.data];
//   });
//   it.each(runExamples)('%s: run: %s -> %s', async (id: string, queryString: string, resultIds: string[], data: SessionInput[]) => {
//     await useDatabase(async (conn) => {
//       const qb = createQueryBuilder();

//       if (data.length > 0) {
//         const builder = qb.insertInto('session').values(data);

//         await executeQuery(builder, conn);
//       }

//       const searchService = new SearchService(conn);
//       // main search query
//       const { results, totalCount } = await searchService.querySessions({
//         query: queryString,
//         isSearch: true,
//       });
//       expect(results.length).toBe(totalCount);
//       expect(new Set(results.map((row) => row.id))).toStrictEqual(new Set(resultIds));
//       // for facets & timeline, just make sure they run w/o failing
//       await searchService.querySessionFacets({
//         query: queryString,
//         facetsSize: 10,
//       });
//       await searchService.querySessionTimeline({
//         query: queryString,
//         granularity: 5
//       });
//     });
//   });
// });
