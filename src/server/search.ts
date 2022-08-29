import { DataSource, EntityTarget, SelectQueryBuilder, EntityManager } from "typeorm";
import { maybeAbort } from "./abort";
import {
  Clause,
  renderClause,
  IndexToken,
  parseQueryString,
  BinaryOperator,
  AggregateOperator,
  factorClause,
  getSearchString,
  mapClauses,
  isUnary,
  isFilter,
} from "./clause";
import { Session, SessionIndex } from "../models";
import { Fts5TableArgs, getColumn } from "../models/fts5";
import {
  QuerySessionsRequest,
  QuerySessionsResponse,
  QuerySessionFacetsRequest,
  QuerySessionFacetsResponse,
  SessionResponse,
  QuerySessionTimelineRequest,
  QuerySessionTimelineResponse,
} from "./types";
import { dateToSqliteString } from "./utils";
import stopwordsTxt from "./stopwords.txt";

function sessionToSessionResponse(
  session: Session & {
    childCount: number,
    childTransitions: Record<string, string>,
    highlightedTitle: string,
    highlightedHost: string,
  }
): SessionResponse {
  return {
    ...session,
    startedAt: session.startedAt.toString(),
    endedAt: session.endedAt?.toString(),
  };
}

export function sessionIndexTableArgs(
  src: DataSource,
  index: EntityTarget<any>,
  tokenize?: string
): Fts5TableArgs {
  const tableMeta = src.getMetadata(Session);
  const indexMeta = src.getMetadata(index);

  const indexedColumns = ["host", "url", "title", "rawUrl", "dum"];

  return {
    tableName: indexMeta.tableName,
    contentTableName: tableMeta.tableName,
    columns: indexMeta.columns.flatMap((col) => {
      const name = col.databaseNameWithoutPrefixes;
      return ["rowid", "dum"].includes(name)
        ? []
        : [[name, indexedColumns.includes(name)]];
    }),
    tokenize: tokenize ?? "unicode61",
  };
}

function cleanDateInput(dateString: string): Date {
  // First check for timestamp--detect if second or millisecond
  if (/^\d+$/.test(dateString)) {
    let number = Number(dateString);
    const maxSecondTimestamp = new Date('3000').getTime() / 1000;
    if (number < maxSecondTimestamp) {
      number *= 1000;
    }
    return new Date(number);
  }

  const dateRegexes = [
    `(?<year>\\d{4})-(?<month>\\d{1,2})-(?<day>\\d{1,2})`,
    `(?<year>\\d{4})/(?<month>\\d{1,2})/(?<day>\\d{1,2})`,
    `(?<month>\\d{1,2})-(?<day>\\d{1,2})-(?<year>\\d{4})`,
    `(?<month>\\d{1,2})/(?<day>\\d{1,2})/(?<year>\\d{4})`,
    `(?<month>\\d{1,2})-(?<day>\\d{1,2})`,
    `(?<month>\\d{1,2})/(?<day>\\d{1,2})`,
  ];

  const timeRegexes = [
    `(?:[T ](?<hour>\\d{1,2})(?::(?<minute>\\d{1,2})(?::(?<second>\\d{1,2}))?)?)?`
  ];

  const now = new Date();

  for (const dateRegex of dateRegexes.concat(['']))  {
    for (const timeRegex of timeRegexes.concat([''])) {
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
  dataSource: DataSource,
  clause: Clause<Session>
): Clause<Session> {
  const factored = factorClause(clause);

  const sessionMeta = dataSource.getMetadata(Session);
  const columns = new Set(sessionMeta.columns.map((col) => col.databaseNameWithoutPrefixes));
  columns.add(IndexToken);

  const indexArgs = sessionIndexTableArgs(dataSource, SessionIndex);
  const indexedMap = Object.fromEntries(indexArgs.columns.map(getColumn));

  const mapped = mapClauses(factored, (clause) => {
    if (isUnary(clause) && clause.clause.operator === BinaryOperator.Match) {
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: `dum:dum NOT ${clause.clause.value}`
      };
    }
    if (
      clause.operator === BinaryOperator.Equals
      && indexedMap[clause.fieldName]
    ) {
      const stringValue = getSearchString(clause.value as string)
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: clause.fieldName === IndexToken ? stringValue : (
          `${clause.fieldName}:${stringValue}`
        )
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
        if (!isNaN(dtValue.getTime())) {
          clause.value = dateToSqliteString(dtValue);
        }
      }
    } else if (isFilter(clause) && ['interactionCount', 'tabId', 'rowid'].includes(clause.fieldName)) {
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

export class SearchService {

  readonly manager: EntityManager;

  constructor(
    readonly dataSource: DataSource,
    manager?: EntityManager,
  ) {
    this.manager = manager ?? dataSource.manager;
  }

  private searchQueryBuilder(
    request: QuerySessionsRequest,
    isSearch?: boolean,
  ): SelectQueryBuilder<SessionIndex | Session> {
    const repo = this.manager.getRepository(isSearch ? SessionIndex : Session);

    const clauses: Clause<Session>[] = [];

    let builder = repo
      .createQueryBuilder("s")
      .select("*")
      .orderBy("s.startedAt", "DESC");

    if (request.query) {
      if (!isSearch) {
        throw new Error('query strings only supported for search queries');
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
    if (isSearch) {
      fullClause = prepareClauseForSearch(this.dataSource, fullClause);
      builder = builder
        .addSelect(
          `highlight("session_index", 4, '{~{~{', '}~}~}')`,
          "highlightedTitle"
        )
        .addSelect(
          `highlight("session_index", 2, '{~{~{', '}~}~}')`,
          "highlightedHost"
        )
    }

    const getFieldName = (fieldName: string) => {
      if (fieldName === IndexToken) {
        return "session_index";
      }
      return `s.${fieldName}`;
    };

    const [sql, params] = renderClause({
      clause: fullClause,
      getFieldName,
    });

    builder = builder.where(sql, params);

    return builder;
  }

  private async getChildCounts(parentIds: string[]): Promise<Record<string, ChildStats>> {
    const childCountsSql = `
      SELECT
        s.parentSessionId as id,
        COUNT(1) as childCount,
        json_group_object(s.id, s.transitionType) as childTransitions
      FROM
        session s
      WHERE
        s.parentSessionId IN (:...parentIds)
      GROUP BY s.parentSessionId
    `;

    const builder = this.manager
      .createQueryBuilder()
      .from(`(${childCountsSql})`, 's')
      .setParameters({ parentIds });

    const results = await builder.getRawMany();

    return Object.fromEntries(results.map((row) => {
      return [
        row.id,
        {
          childCount: row.childCount,
          childTransitions: JSON.parse(row.childTransitions),
        }
      ];
    }));
  }

  private async getHostStats(
    rowIdBuilder: SelectQueryBuilder<SessionIndex | Session>,
    count: number
  ): Promise<any[]> {
    const sessionRepo = this.manager.getRepository(Session);
    const sessionQueryBuilder = sessionRepo
      .createQueryBuilder()
      .select("*")
      .where(`rowid IN (${rowIdBuilder.getQuery()})`)
      .setParameters(rowIdBuilder.getParameters());

    return await this.manager
      .createQueryBuilder()
      .select("t.host", "value")
      .addSelect("COUNT(1)", "count")
      .from(`(${sessionQueryBuilder.getQuery()})`, "t")
      .setParameters(sessionQueryBuilder.getParameters())
      .groupBy("t.host")
      .having("t.host IS NOT NULL")
      .orderBy("2", "DESC")
      .limit(count)
      .getRawMany();
  }

  private async getTermStats(
    rowIdBuilder: SelectQueryBuilder<SessionIndex | Session>,
    count: number
  ): Promise<any[]> {
    const sql = `
      WITH doc_term_counts AS (
        SELECT
          term,
          doc,
          doc IN (${rowIdBuilder.getQuery()}) as is_result,
          COUNT(1) as count
        FROM
          session_term_index_vocab
        WHERE
          col = 'title'
          AND term NOT IN (:...stopwords)
        GROUP BY 
          term, doc, is_result
      ), doc_counts AS (
        SELECT
          is_result,
          SUM(count) as count
        FROM
          doc_term_counts
        GROUP BY is_result
      ), total_terms AS (
        SELECT
          SUM(count) as count
        FROM
          doc_term_counts
        WHERE is_result
      ), tf AS (
        SELECT
          t.term,
          SUM(t.count) as count,
          CAST(SUM(t.count) AS REAL) / t2.count as tf
        FROM
          doc_term_counts t,
          total_terms t2
        WHERE
          t.is_result
        GROUP BY term
      ), total_docs AS (
        SELECT
          COUNT(DISTINCT doc) as count
        FROM
          doc_term_counts
      ), idf AS (
        SELECT
          t.term,
          ln(t2.count / COUNT(1)) as idf
        FROM
          doc_term_counts t,
          total_docs t2
        GROUP BY t.term
      ), tfidf AS (
        SELECT
          t.term,
          t.count,
          t.tf,
          t2.idf,
          t.tf * t2.idf as tfidf
        FROM
          tf t
          JOIN idf t2 ON t.term = t2.term
        WHERE length(t.term) > 2
      )
      SELECT
        t.term as value,
        t.count,
        t.tf,
        t.idf,
        t.tfidf
      FROM
        tfidf t
      ORDER BY t.tfidf DESC, t.count DESC
    `;

    const stopwords = stopwordsTxt.split("\n").filter((x) => x);

    const builder = this.manager
      .createQueryBuilder()
      .from(`(${sql})`, "t")
      .setParameters(rowIdBuilder.getParameters())
      .setParameter("stopwords", stopwords)
      .select("*")
      .limit(count);

    return await builder.getRawMany();
  }

  private async detectGranularity(
    rowIdBuilder: SelectQueryBuilder<SessionIndex | Session>,
    maxBuckets: number
  ): Promise<QuerySessionTimelineRequest["granularity"] & string> {
    const minMaxQueryBuilder = this.manager
      .createQueryBuilder()
      .from(Session, "t")
      .where(
        `t.rowid IN (${rowIdBuilder.getQuery()})`,
        rowIdBuilder.getParameters()
      )
      .select("MIN(t.startedAt)", "minStartedAt")
      .addSelect("MAX(t.startedAt)", "maxStartedAt");

    const { minStartedAt, maxStartedAt } = await minMaxQueryBuilder.getRawOne();

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
    rowIdBuilder: SelectQueryBuilder<SessionIndex | Session>,
    granularity: QuerySessionTimelineRequest["granularity"]
  ): Promise<QuerySessionTimelineResponse> {
    let stringGranularity: QuerySessionTimelineRequest["granularity"] & string;
    if (typeof granularity === "number") {
      stringGranularity = await this.detectGranularity(
        rowIdBuilder,
        granularity
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

    const sql = `
      SELECT
        strftime(:datefmt, s.startedAt, 'localtime') as dateString
      FROM
        session s
      WHERE s.rowid IN (${rowIdBuilder.getQuery()})
    `;

    const timeline = await this.manager
      .createQueryBuilder()
      .select("t.dateString")
      .addSelect("COUNT(1)", "count")
      .from(`(${sql})`, "t")
      .setParameters(rowIdBuilder.getParameters())
      .setParameter("datefmt", format)
      .groupBy("t.dateString")
      .getRawMany();

    return {
      granularity: stringGranularity,
      timeline,
    };
  }

  async querySessions(
    request: QuerySessionsRequest
  ): Promise<QuerySessionsResponse> {
    let builder = this.searchQueryBuilder(request, request.isSearch);

    // let builderWithCount = this.manager
    //   .createQueryBuilder()
    //   .select('*')
    //   .addSelect('COUNT(1) OVER ()', 'totalCount')
    //   .from(`(${builder.getQuery()})`, 't')
    //   .setParameters(builder.getParameters());

    if (request.skip) {
      builder = builder.offset(request.skip);
    }
    if (request.limit) {
      builder = builder.limit(request.limit);
    }

    const rawResults = await builder.getRawMany();
    maybeAbort(request.abort);

    // const totalCount = rawResults.length === 0 ? 0 : rawResults[0].totalCount;
    const totalCount = await builder.getCount();
    maybeAbort(request.abort);

    if (request.isSearch) {
      const ids = rawResults.map((row) => row.id);
      const childCounts = request.isSearch ? await this.getChildCounts(ids) : {};
      maybeAbort(request.abort);
      rawResults.forEach((row) => {
        if (childCounts[row.id]) {
          Object.assign(row, childCounts[row.id]);
        } else {
          Object.assign(row, { childCount: 0, childTransitions: {} })
        }
      });
    }

    const results = rawResults.map(sessionToSessionResponse);

    return {
      totalCount,
      results,
    };
  }

  async querySessionFacets(
    request: QuerySessionFacetsRequest
  ): Promise<QuerySessionFacetsResponse> {
    const builder = this.searchQueryBuilder(request, true);

    const rowIdBuilder = builder.clone().select("s.rowid");

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

  async querySessionTimeline(
    request: QuerySessionTimelineRequest
  ): Promise<QuerySessionTimelineResponse> {
    const builder = this.searchQueryBuilder(request, true);

    const rowIdBuilder = builder.clone().select("s.rowid");

    return await this.getTimeline(rowIdBuilder, request.granularity);
  }
}
