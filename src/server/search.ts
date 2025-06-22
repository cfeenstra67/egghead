import { sql } from "kysely";
import {
  type Session,
  indexedColumns,
  sessionIndexTable,
  sessionTable,
} from "../models";
import type { Table } from "../models/base.js";
import { type Fts5TableArgs, getColumn } from "../models/fts5.js";
import { maybeAbort } from "./abort.js";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
  IndexToken,
  factorClause,
  getSearchString,
  isFilter,
  isUnary,
  mapClauses,
  parseQueryString,
} from "./clause.js";
import { renderClause } from "./render-clause.js";
import {
  type Database,
  type QueryBuilder,
  type RemoveAnnotations,
  type SQLConnection,
  createQueryBuilder,
  executeQuery,
} from "./sql-primitives.js";
import stopwordsTxt from "./stopwords.txt";
import type {
  DeleteSessionsRequest,
  QuerySessionFacetRequest,
  QuerySessionFacetResponse,
  QuerySessionFacetsRequest,
  QuerySessionFacetsResponse,
  QuerySessionTimelineRequest,
  QuerySessionTimelineResponse,
  QuerySessionsRequest,
  QuerySessionsResponse,
  SessionResponse,
} from "./types.js";
import { dateToSqliteString } from "./utils.js";

function sessionToSessionResponse(
  session: RemoveAnnotations<Database["session"]> & {
    childCount: number;
    childTransitions: Record<string, string>;
    highlightedTitle: string;
    highlightedHost: string;
    highlightedUrl: string;
  },
): SessionResponse {
  return {
    ...session,
    startedAt: session.startedAt.toString(),
    endedAt: session.endedAt?.toString(),
  };
}

export function sessionIndexTableArgs(
  table: Table,
  tokenize?: string,
): Fts5TableArgs {
  const srcTable = sessionTable;

  return {
    tableName: table.name,
    contentTableName: srcTable.name,
    columns: Object.keys(sessionTable.columns).flatMap((name) => {
      return ["rowid", "dum"].includes(name)
        ? []
        : [[name, indexedColumns.has(name)]];
    }),
    tokenize: tokenize ?? "unicode61",
  };
}

function cleanDateInput(dateString: string): Date {
  // First check for timestamp--detect if second or millisecond
  if (/^\d+$/.test(dateString)) {
    let number = Number(dateString);
    const maxSecondTimestamp = new Date("3000").getTime() / 1000;
    if (number < maxSecondTimestamp) {
      number *= 1000;
    }
    return new Date(number);
  }

  const dateRegexes = [
    "(?<year>\\d{4})-(?<month>\\d{1,2})-(?<day>\\d{1,2})",
    "(?<year>\\d{4})/(?<month>\\d{1,2})/(?<day>\\d{1,2})",
    "(?<month>\\d{1,2})-(?<day>\\d{1,2})-(?<year>\\d{4})",
    "(?<month>\\d{1,2})/(?<day>\\d{1,2})/(?<year>\\d{4})",
    "(?<month>\\d{1,2})-(?<day>\\d{1,2})",
    "(?<month>\\d{1,2})/(?<day>\\d{1,2})",
  ];

  const timeRegexes = [
    "(?:[T ](?<hour>\\d{1,2})(?::(?<minute>\\d{1,2})(?::(?<second>\\d{1,2}))?)?)?",
  ];

  const now = new Date();

  for (const dateRegex of dateRegexes.concat([""])) {
    for (const timeRegex of timeRegexes.concat([""])) {
      const fullRegex = new RegExp(`^${dateRegex}${timeRegex}$`);
      const match = fullRegex.exec(dateString);
      if (match) {
        const groups = match.groups ?? {};
        return new Date(
          groups.year ? Number(groups.year) : now.getFullYear(),
          groups.month ? Number(groups.month) - 1 : now.getMonth(),
          groups.day ? Number(groups.day) : now.getDate(),
          groups.hour ? Number(groups.hour) : 0,
          groups.minute ? Number(groups.minute) : 0,
          groups.second ? Number(groups.second) : 0,
        );
      }
    }
  }

  // If all else fails, just try to use the date constructor
  return new Date(dateString);
}

export function prepareClauseForSearch(
  clause: Clause<Session>,
): Clause<Session> {
  const factored = factorClause(clause);

  const columns = new Set(Object.keys(sessionTable.columns));
  columns.add(IndexToken);

  const indexArgs = sessionIndexTableArgs(sessionIndexTable);
  const indexedMap = Object.fromEntries(indexArgs.columns.map(getColumn));

  const mapped = mapClauses(factored, (clause) => {
    if (isUnary(clause) && clause.clause.operator === BinaryOperator.Match) {
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: `dum:dum NOT ${clause.clause.value}`,
      };
    }
    if (
      clause.operator === BinaryOperator.Equals &&
      indexedMap[clause.fieldName]
    ) {
      const stringValue = getSearchString(clause.value as string);
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value:
          clause.fieldName === IndexToken
            ? stringValue
            : `${clause.fieldName}:${stringValue}`,
      };
    }
    if (isFilter(clause) && !columns.has(clause.fieldName)) {
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: getSearchString(`${clause.fieldName}:${clause.value}`),
      };
    }
    if (isFilter(clause) && clause.fieldName.endsWith("At")) {
      if (clause.value !== null && clause.value !== undefined) {
        const dtValue = cleanDateInput(clause.value as string);
        if (!Number.isNaN(dtValue.getTime())) {
          clause.value = dateToSqliteString(dtValue);
        }
      }
    } else if (
      isFilter(clause) &&
      ["interactionCount", "tabId", "rowid"].includes(clause.fieldName)
    ) {
      if ([BinaryOperator.In, BinaryOperator.NotIn].includes(clause.operator)) {
        clause.value = (clause.value as string[]).map(Number);
      } else {
        clause.value = Number(clause.value);
      }
    }
    return clause;
  });
  return mapped;
}

interface ChildStats {
  childCount: number;
  childTransitions: Record<string, string>;
}

type SearchQueryBuilder = ReturnType<SearchService["searchQueryBuilder"]>;

type RowIdQueryBuilder = ReturnType<SearchService["rowIdQueryBuilder"]>;

export class SearchService {
  private readonly queryBuilder: QueryBuilder;

  constructor(readonly connection: SQLConnection) {
    this.queryBuilder = createQueryBuilder();
  }

  private searchQueryBuilder(
    request: QuerySessionsRequest,
    isSearch?: boolean,
    highlight?: boolean,
  ) {
    const clauses: Clause<Session>[] = [];

    let builder = this.queryBuilder
      .selectFrom(isSearch ? "session_index as s" : "session as s")
      .selectAll()
      .orderBy("s.startedAt desc");

    if (request.query) {
      if (!isSearch) {
        throw new Error("query strings only supported for search queries");
      }
      clauses.push(parseQueryString<Session>(request.query));
    }

    if (request.filter !== undefined) {
      clauses.push(request.filter);
    }

    let fullClause: Clause<Session> = {
      operator: AggregateOperator.And,
      clauses,
    };
    if (isSearch && highlight) {
      fullClause = prepareClauseForSearch(fullClause);
      builder = builder.select(({ eb }) => [
        eb
          .fn("highlight", [
            sql.id("session_index"),
            eb.lit(4),
            sql.lit("{~{~{"),
            sql.lit("}~}~}"),
          ])
          .as("highlightedTitle"),
        eb
          .fn("highlight", [
            sql.id("session_index"),
            eb.lit(2),
            sql.lit("{~{~{"),
            sql.lit("}~}~}"),
          ])
          .as("highlightedHost"),
        eb
          .fn("highlight", [
            sql.id("session_index"),
            eb.lit(3),
            sql.lit("{~{~{"),
            sql.lit("}~}~}"),
          ])
          .as("highlightedUrl"),
      ]);
    }

    const getFieldName = (fieldName: string) => {
      if (fieldName === IndexToken) {
        return ["session_index"];
      }
      return ["s", fieldName];
    };

    const whereClause = renderClause({
      clause: fullClause,
      getFieldName,
    });

    builder = builder.where(whereClause);

    if (request.childFilter) {
      const childClause = renderClause({
        clause: {
          operator: AggregateOperator.And,
          clauses: [
            request.childFilter,
            {
              operator: BinaryOperator.NotEquals,
              fieldName: "parentSessionId",
              value: null,
            },
          ],
        },
        getFieldName,
      });

      const childBuilder = this.queryBuilder
        .selectFrom("session as s")
        .select("parentSessionId")
        .where(childClause);

      builder = builder.where("id", "in", childBuilder);
    }

    return builder;
  }

  private rowIdQueryBuilder(builder: SearchQueryBuilder) {
    return builder.clearSelect().select(["s.rowid"]);
  }

  private async getChildCounts(
    parentIds: string[],
  ): Promise<Record<string, ChildStats>> {
    const builder = this.queryBuilder
      .selectFrom("session as s")
      .select(({ eb }) => [
        "s.parentSessionId as id",
        eb.fn("COUNT", [eb.lit(1)]).as("childCount"),
        eb
          .fn<string>("json_group_object", ["s.id", "s.transitionType"])
          .as("childTransitions"),
      ])
      .where("s.parentSessionId", "in", parentIds)
      .groupBy("s.parentSessionId");

    const results = await executeQuery(builder, this.connection);

    return Object.fromEntries(
      results.map((row) => {
        return [
          row.id,
          {
            childCount: row.childCount,
            childTransitions: JSON.parse(row.childTransitions),
          },
        ];
      }),
    );
  }

  private async getHostStats(
    rowIdBuilder: RowIdQueryBuilder,
    count: number,
  ): Promise<any[]> {
    const sessionQueryBuilder = this.queryBuilder
      .selectFrom("session")
      .selectAll()
      .where("rowid", "in", rowIdBuilder);

    const resultBuilder = this.queryBuilder
      .selectFrom(sessionQueryBuilder.as("t"))
      .select(({ eb }) => [
        "t.host as value",
        eb.fn<number>("COUNT", [eb.lit(1)]).as("count"),
      ])
      .groupBy("t.host")
      .having("t.host", "is not", null)
      .orderBy("count desc")
      .limit(count);

    return await executeQuery(resultBuilder, this.connection);
  }

  private async getTermStats(
    rowIdBuilder: RowIdQueryBuilder,
    count: number,
  ): Promise<any[]> {
    const stopwords = stopwordsTxt.split("\n").filter((x) => x);

    const docTermCountsBuilder = this.queryBuilder.with(
      "doc_term_counts",
      (qb) =>
        qb
          .selectFrom("session_term_index_vocab")
          .select(({ eb }) => [
            "term",
            "doc",
            eb("doc", "in", rowIdBuilder).as("is_result"),
            eb.fn<number>("COUNT", [eb.lit(1)]).as("count"),
          ])
          .where("col", "=", "title")
          .where("term", "not in", stopwords)
          .where(({ eb }) =>
            eb(eb.fn<number>("length", [eb.ref("term")]), ">=", 3),
          )
          .groupBy(["term", "doc", "is_result"]),
    );

    const docCountsBuilder = docTermCountsBuilder.with("doc_counts", (qb) =>
      qb
        .selectFrom("doc_term_counts")
        .select(({ eb }) => [
          "is_result",
          eb.fn<number>("SUM", ["count"]).as("count"),
        ])
        .groupBy("is_result"),
    );

    const totalTermsBuilder = docCountsBuilder.with("total_terms", (qb) =>
      qb
        .selectFrom("doc_term_counts")
        .select(({ eb }) => eb.fn<number>("SUM", ["count"]).as("count"))
        .where("is_result", "=", true),
    );

    const tfBuilder = totalTermsBuilder.with("tf", (qb) =>
      qb
        .selectFrom(["doc_term_counts as t", "total_terms as t2"])
        .select(({ eb }) => [
          "t.term",
          eb.fn("SUM", ["t.count"]).as("count"),
          eb(
            eb.cast(eb.fn("SUM", ["t.count"]), "real"),
            "/",
            eb.ref("t2.count"),
          ).as("tf"),
        ])
        .where("t.is_result", "=", true)
        .groupBy("term"),
    );

    const totalDocsBuilder = tfBuilder.with("total_docs", (qb) =>
      qb
        .selectFrom("doc_term_counts")
        .select(({ eb }) => [eb.fn("COUNT", [sql`DISTINCT doc`]).as("count")]),
    );

    const idfBuilder = totalDocsBuilder.with("idf", (qb) =>
      qb
        .selectFrom(["doc_term_counts as t", "total_docs as t2"])
        .select(({ eb }) => [
          "t.term",
          eb
            .fn("ln", [eb("t2.count", "/", eb.fn("COUNT", [eb.lit(1)]))])
            .as("idf"),
        ])
        .groupBy("t.term"),
    );

    const tfidfBuilder = idfBuilder.with("tfidf", (qb) =>
      qb
        .selectFrom(["tf as t"])
        .innerJoin("idf as t2", "t.term", "t2.term")
        .select(({ eb }) => [
          "t.term",
          "t.count",
          "t.tf",
          "t2.idf",
          eb("t.tf", "*", eb.ref("t2.idf")).as("tfidf"),
        ]),
    );

    const builder = tfidfBuilder
      .selectFrom("tfidf as t")
      .select(["t.term as value", "t.count", "t.tf", "t.idf", "t.tfidf"])
      .orderBy(["t.tfidf desc", "t.count desc"])
      .limit(count);

    return await executeQuery(builder, this.connection);
  }

  private async detectGranularity(
    rowIdBuilder: RowIdQueryBuilder,
    maxBuckets: number,
  ): Promise<QuerySessionTimelineRequest["granularity"] & string> {
    const minMaxQueryBuilder = this.queryBuilder
      .selectFrom("session as t")
      .where(({ eb }) => eb("t.rowid", "in", rowIdBuilder))
      .select(({ eb }) => [
        eb.fn<Date>("MIN", ["t.startedAt"]).as("minStartedAt"),
        eb.fn<Date>("MAX", ["t.startedAt"]).as("maxStartedAt"),
      ]);

    const [{ minStartedAt, maxStartedAt }] = await executeQuery(
      minMaxQueryBuilder,
      this.connection,
    );

    const totalDiff: number =
      new Date(maxStartedAt).getTime() - new Date(minStartedAt).getTime();

    const intervalLengths = {
      hour: 1000 * 3600,
      day: 1000 * 3600 * 24,
      week: 1000 * 3600 * 24 * 7,
      month: 1000 * 3600 * 24 * 30,
    };

    return (
      Object.entries(intervalLengths).flatMap(([key, value]) => {
        const buckets = Math.ceil(totalDiff / value);
        return buckets < maxBuckets
          ? [key as QuerySessionTimelineRequest["granularity"] & string]
          : [];
      })[0] ?? "month"
    );
  }

  private async getTimeline(
    rowIdBuilder: RowIdQueryBuilder,
    granularity: QuerySessionTimelineRequest["granularity"],
  ): Promise<QuerySessionTimelineResponse> {
    let stringGranularity: QuerySessionTimelineRequest["granularity"] & string;
    if (typeof granularity === "number") {
      stringGranularity = await this.detectGranularity(
        rowIdBuilder,
        granularity,
      );
    } else {
      stringGranularity = granularity;
    }

    let format: string;
    switch (stringGranularity) {
      case "hour":
        format = "%Y-%m-%dT%H";
        break;
      case "day":
        format = "%Y-%m-%d";
        break;
      case "week":
        format = "%Y-%W";
        break;
      case "month":
        format = "%Y-%m";
        break;
    }

    const builder = this.queryBuilder
      .selectFrom("session as s")
      .select(({ eb }) => [
        eb
          .fn<string>("strftime", [
            sql.lit(format),
            "s.startedAt",
            sql.lit("localtime"),
          ])
          .as("dateString"),
      ])
      .where("s.rowid", "in", rowIdBuilder);

    const timelineBuilder = this.queryBuilder
      .selectFrom(builder.as("t"))
      .select(({ eb }) => [
        "t.dateString",
        eb.fn<number>("COUNT", [eb.lit(1)]).as("count"),
      ])
      .groupBy("t.dateString");

    const timeline = await executeQuery(timelineBuilder, this.connection);

    return {
      granularity: stringGranularity,
      timeline,
    };
  }

  async querySessions(
    request: QuerySessionsRequest,
  ): Promise<QuerySessionsResponse> {
    const originalBuilder = this.searchQueryBuilder(
      request,
      request.isSearch,
      true,
    );

    let builder = originalBuilder;

    if (request.skip) {
      builder = builder.offset(request.skip);
    }
    if (request.limit) {
      builder = builder.limit(request.limit);
    }

    const rawResults = await executeQuery(builder, this.connection);
    maybeAbort(request.abort);

    const totalCountBuilder = this.queryBuilder
      .selectFrom(originalBuilder.as("b"))
      .select(({ eb }) => eb.fn<number>("COUNT", [eb.lit(1)]).as("count"));

    const totalCount = await executeQuery(totalCountBuilder, this.connection);
    maybeAbort(request.abort);

    if (request.isSearch) {
      const ids = rawResults.map((row) => row.id);
      const childCounts = request.isSearch
        ? await this.getChildCounts(ids)
        : {};
      maybeAbort(request.abort);
      rawResults.forEach((row) => {
        if (childCounts[row.id]) {
          Object.assign(row, childCounts[row.id]);
        } else {
          Object.assign(row, { childCount: 0, childTransitions: {} });
        }
      });
    }

    const results = rawResults.map((row) =>
      sessionToSessionResponse(row as any),
    );

    return {
      totalCount: totalCount.length === 0 ? 0 : (totalCount[0].count ?? 0),
      results,
    };
  }

  async querySessionFacets(
    request: QuerySessionFacetsRequest,
  ): Promise<QuerySessionFacetsResponse> {
    const builder = this.searchQueryBuilder(request, true);

    const rowIdBuilder = this.rowIdQueryBuilder(builder);

    const facetsSize = request.facetsSize ?? 25;

    const hostStats = await this.getHostStats(rowIdBuilder, facetsSize);
    maybeAbort(request.abort);

    const termStats = await this.getTermStats(rowIdBuilder, facetsSize);
    maybeAbort(request.abort);

    return {
      host: hostStats,
      term: termStats,
    };
  }

  async querySessionFacet(
    request: QuerySessionFacetRequest,
  ): Promise<QuerySessionFacetResponse> {
    const builder = this.searchQueryBuilder(request, true);

    const rowIdBuilder = this.rowIdQueryBuilder(builder);

    const facetsSize = request.facetsSize ?? 25;

    let values: any[];
    if (request.facet === "host") {
      values = await this.getHostStats(rowIdBuilder, facetsSize);
    } else if (request.facet === "term") {
      values = await this.getTermStats(rowIdBuilder, facetsSize);
    } else {
      throw new Error(`Invalid facet: ${request.facet}`);
    }

    return { values };
  }

  async querySessionTimeline(
    request: QuerySessionTimelineRequest,
  ): Promise<QuerySessionTimelineResponse> {
    const builder = this.searchQueryBuilder(request, true);

    const rowIdBuilder = this.rowIdQueryBuilder(builder);

    return await this.getTimeline(rowIdBuilder, request.granularity);
  }

  async deleteSessions(
    request: Omit<DeleteSessionsRequest, "deleteCorrespondingChromeHistory">,
  ): Promise<string[]> {
    const queryBuilder = this.searchQueryBuilder(request);
    const rowIdBuilder = this.rowIdQueryBuilder(queryBuilder);
    const deleteQuery = this.queryBuilder
      .deleteFrom("session")
      .where("session.rowid", "in", rowIdBuilder)
      .returning("id");

    const results = await executeQuery(deleteQuery, this.connection);

    return results.map((row) => row.id);
  }
}
