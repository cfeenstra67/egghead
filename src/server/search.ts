import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import {
  renderClause,
  IndexToken,
  parseQueryString,
  BinaryOperator,
} from './clause';
import {
  Session,
  SessionIndex,
  SessionTermIndex,
  SessionTermIndexVocab
} from '../models';
import {
  Fts5TableArgs,
  createFts5Index,
  dropFts5Index,
  getColumn,
} from '../models/fts5';
import {
  QuerySessionsRequest,
  QuerySessionsResponse,
  SessionResponse,
} from './types';

function sessionToSessionResponse(session: Session): SessionResponse {
  return {
    ...session,
    startedAt: session.startedAt.toString(),
    endedAt: session.endedAt?.toString(),
  } as any;
}

export function sessionIndexTableArgs(
  src: DataSource,
  index: EntityTarget<any>,
  tokenize?: string
): Fts5TableArgs {
  const tableMeta = src.getMetadata(Session);
  const indexMeta = src.getMetadata(index);

  const indexedColumns = [
    'host',
    'url',
    'title',
    'rawUrl',
  ];

  return {
    tableName: indexMeta.tableName,
    contentTableName: tableMeta.tableName,
    columns: indexMeta.columns.flatMap((col) => {
      const name = col.databaseNameWithoutPrefixes;
      return name === 'rowid' ? [] : [[name, indexedColumns.includes(name)]];
    }),
    tokenize: tokenize ?? 'unicode61',
  };
}

export class SearchService {

  constructor(readonly dataSource: DataSource) {}

  private async searchQueryBuilder(
    request: QuerySessionsRequest
  ): Promise<SelectQueryBuilder<SessionIndex>> {
    const repo = this.dataSource.getRepository(SessionIndex);
    let builder = await repo
      .createQueryBuilder('s')
      .loadRelationCountAndMap(
        's.childCount',
        's.childSessions',
        'children'
      )
      .orderBy('s.startedAt', 'DESC');

    const getFieldName = (fieldName: string) => {
      if (fieldName === IndexToken) {
        return 'session_index';
      }
      return `s.${fieldName}`;
    };

    if (request.query) {
      const clause = parseQueryString<Session>(request.query);
      const indexArgs = sessionIndexTableArgs(this.dataSource, SessionIndex);
      const indexedMap = Object.fromEntries(indexArgs.columns.map(getColumn));

      const [sql, params] = renderClause({
        clause,
        getFieldName,
        getFilter: (filter) => {
          if (
            indexedMap[filter.fieldName] &&
            filter.operator === BinaryOperator.Match
          ) {
            return {
              operator: BinaryOperator.Match,
              fieldName: IndexToken,
              value: filter.fieldName === IndexToken ? (
                JSON.stringify(filter.value)
              ) : ( 
                `${filter.fieldName}:${filter.value}`
              ),
            };
          }
          return filter;
        }
      });

      builder = builder.where(sql, params);
    }

    if (request.filter !== undefined) {
      const [sql, params] = renderClause({
        clause: request.filter,
        getFieldName,
      });
      builder = builder.where(sql, params);
    }
    return builder;
  }

  private async getHostStats(
    rowIdBuilder: SelectQueryBuilder<SessionIndex>,
    count: number,
  ): Promise<any[]> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const sessionQueryBuilder = sessionRepo
      .createQueryBuilder()
      .select('*')
      .where(`rowid IN (${rowIdBuilder.getQuery()})`)
      .setParameters(rowIdBuilder.getParameters());

    return await this.dataSource
      .createQueryBuilder()
      .select('t.host', 'value')
      .addSelect('COUNT(1)', 'count')
      .from(`(${sessionQueryBuilder.getQuery()})`, 't')
      .setParameters(sessionQueryBuilder.getParameters())
      .groupBy('t.host')
      .where('t.host IS NOT NULL')
      .orderBy('2', 'DESC')
      .limit(count)
      .getRawMany();
  }

  private async getTermStats(
    rowIdBuilder: SelectQueryBuilder<SessionIndex>,
    count: number,
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

    const builder = this.dataSource
      .createQueryBuilder()
      .from(`(${sql})`, 't')
      .setParameters(rowIdBuilder.getParameters())
      .select('*')
      .limit(count);

    return await builder.getRawMany();
  }

  async querySessions(request: QuerySessionsRequest): Promise<QuerySessionsResponse> {
    const repo = this.dataSource.getRepository(SessionIndex);

    let builder = await this.searchQueryBuilder(request);

    const rowIdBuilder = builder
      .clone()
      .select('s.rowid');

    const facetsSize = 25;

    const hostStats = await this.getHostStats(rowIdBuilder, facetsSize);

    const termStats = await this.getTermStats(rowIdBuilder, facetsSize);

    const totalCount = await builder.getCount();

    if (request.skip) {
      builder = builder.offset(request.skip);
    }
    if (request.limit) {
      builder = builder.limit(request.limit);
    }

    const results = (await builder.getMany()).map(sessionToSessionResponse);

    return {
      totalCount,
      facets: {
        host: hostStats,
        term: termStats,
      },
      results,
    };
  }

}
