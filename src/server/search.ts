import { DataSource, EntityTarget, SelectQueryBuilder } from "typeorm";
import { maybeAbort } from "./abort";
import {
  renderClause,
  IndexToken,
  parseQueryString,
  BinaryOperator,
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
import stophostsTxt from "./stophosts.txt";
import stopwordsTxt from "./stopwords.txt";

function sessionToSessionResponse(
  session: Record<string, any>
): SessionResponse {
  const childTransitions =
    session.childTransitions && JSON.parse(session.childTransitions);
  return {
    ...session,
    startedAt: session.startedAt.toString(),
    endedAt: session.endedAt?.toString(),
    childTransitions,
  } as any;
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

export class SearchService {
  constructor(readonly dataSource: DataSource) {}

  private async searchQueryBuilder(
    request: QuerySessionsRequest,
    isSearch?: boolean,
    includeChildren?: boolean,
  ): Promise<SelectQueryBuilder<SessionIndex | Session>> {
    const repo = this.dataSource.getRepository(isSearch ? SessionIndex : Session);

    const stophosts = stophostsTxt.split("\n").filter((x) => x);

    let builder = await repo
      .createQueryBuilder("s")
      .select("*")
      .where("s.host NOT IN (:...stophosts)", { stophosts })
      .orderBy("s.startedAt", "DESC");

    if (isSearch) {
      builder = builder
        .addSelect(
          `highlight("session_index", 4, '{~{~{', '}~}~}')`,
          "highlightedTitle"
        )
        .addSelect(
          `highlight("session_index", 2, '{~{~{', '}~}~}')`,
          "highlightedHost"
        );
    }

    const getFieldName = (fieldName: string) => {
      if (fieldName === IndexToken) {
        return "session_index";
      }
      return `s.${fieldName}`;
    };

    let paramIndex = 0;

    if (isSearch && request.query) {
      const clause = parseQueryString<Session>(request.query);
      const indexArgs = sessionIndexTableArgs(this.dataSource, SessionIndex);
      const indexedMap = Object.fromEntries(indexArgs.columns.map(getColumn));

      const [sql, params, newParamIndex] = renderClause({
        clause,
        getFieldName,
        getFilter: (filter) => {
          if (
            indexedMap[filter.fieldName] &&
            filter.operator === BinaryOperator.Equals
          ) {
            return {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value:
                filter.fieldName === IndexToken
                  ? JSON.stringify(filter.value)
                  : `${filter.fieldName}:${filter.value}`,
            };
          }
          return filter;
        },
        paramStartIndex: paramIndex,
      });
      paramIndex = newParamIndex;

      builder = builder.andWhere(sql, params);
    }

    if (request.filter !== undefined) {
      const [sql, params, newParamIndex] = renderClause({
        clause: request.filter,
        getFieldName,
        paramStartIndex: paramIndex,
      });
      paramIndex = newParamIndex;
      builder = builder.andWhere(sql, params);
    }

    if (isSearch && includeChildren) {
      const childCountsSql = `
        SELECT
          s.parentSessionId as joinId,
          COUNT(1) as joinChildCount,
          json_group_object(s.id, s.transitionType) as joinChildTransitions
        FROM
          session s
        WHERE s.host NOT IN (:...stophosts)
        GROUP BY s.parentSessionId
      `;

      builder = builder
        .leftJoin(`(${childCountsSql})`, "s2", "s.id = s2.joinId")
        .addSelect("COALESCE(s2.joinChildCount, 0)", "childCount")
        .addSelect(
          `COALESCE(s2.joinChildTransitions, '{}')`,
          "childTransitions"
        );
    }

    return builder;
  }

  private async getHostStats(
    rowIdBuilder: SelectQueryBuilder<SessionIndex | Session>,
    count: number
  ): Promise<any[]> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const sessionQueryBuilder = sessionRepo
      .createQueryBuilder()
      .select("*")
      .where(`rowid IN (${rowIdBuilder.getQuery()})`)
      .setParameters(rowIdBuilder.getParameters());

    return await this.dataSource
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

    const builder = this.dataSource
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
    const minMaxQueryBuilder = this.dataSource
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

    const timeline = await this.dataSource
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
    const builder = await this.searchQueryBuilder(request, request.isSearch, true);
    maybeAbort(request.abort);

    let builderWithCount = this.dataSource
      .createQueryBuilder()
      .select('*')
      .addSelect('COUNT(1) OVER ()', 'totalCount')
      .from(`(${builder.getQuery()})`, 't')
      .setParameters(builder.getParameters());

    if (request.skip) {
      builderWithCount = builder.offset(request.skip);
    }
    if (request.limit) {
      builderWithCount = builder.limit(request.limit);
    }

    const rawResults = await builderWithCount.getRawMany();
    maybeAbort(request.abort);

    const totalCount = rawResults.length === 0 ? 0 : rawResults[0].totalCount;

    const results = rawResults.map(sessionToSessionResponse);

    return {
      totalCount,
      results,
    };
  }

  async querySessionFacets(
    request: QuerySessionFacetsRequest
  ): Promise<QuerySessionFacetsResponse> {
    const builder = await this.searchQueryBuilder(request, true);
    maybeAbort(request.abort);

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
    const builder = await this.searchQueryBuilder(request, true);
    maybeAbort(request.abort);

    const rowIdBuilder = builder.clone().select("s.rowid");

    return await this.getTimeline(rowIdBuilder, request.granularity);
  }
}
