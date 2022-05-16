import { renderClause } from './clause';
import { Session, SessionIndex } from '../models';
import {
  Fts5TableArgs,
  createFts5Index,
  dropFts5Index,
} from '../models/fts5';
import {
  ServerInterface,
  ServerMessage,
  ServerResponseCode,
  ServerRequest,
  ServerResponse,
  QueryRequest,
  QueryResponse,
  SessionResponse,
  QuerySessionsRequest,
  QuerySessionsResponse,
  ExportDatabaseRequest,
  ExportDatabaseResponse,
  RegenerateIndexRequest,
  RegenerateIndexResponse,
  TabChangedRequest,
  TabChangedResponse,
  TabClosedRequest,
  TabClosedResponse,
} from './types';
import { cleanURL, getHost } from './utils';
import { DataSource, Repository, IsNull } from 'typeorm';
import { SqljsDriver } from 'typeorm/driver/sqljs/SqljsDriver';
import { v4 as uuidv4 } from 'uuid';

function sessionToSessionResponse(session: Session): SessionResponse {
  return {
    ...session,
    startedAt: session.startedAt.toString(),
    endedAt: session.endedAt?.toString(),
  } as any;
}

function sessionIndexTableArgs(src: DataSource): Fts5TableArgs {
  const tableMeta = src.getMetadata(Session);
  const indexMeta = src.getMetadata(SessionIndex);

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
    tokenize: 'trigram',
  };
}

export class Server implements ServerInterface {

  constructor(readonly dataSource: DataSource) {}

  async runQuery(request: Omit<QueryRequest, 'type'>): Promise<QueryResponse> {
    const result = await this.dataSource.manager.query(request.query);
    return { result };
  }

  private async getActiveSession(
    tabId: number,
    repo: Repository<Session>,
    now?: Date
  ): Promise<Session | undefined> {
    if (now === undefined) {
      now = new Date();
    }
    const existingSessions = await repo.find({
      where: {
        tabId,
        endedAt: IsNull(),
      },
      order: {
        startedAt: 'DESC'
      }
    });
    // End any other active session(s) for the tab; data cleanup
    if (existingSessions.length > 1) {
      const urls = existingSessions.map((session) => session.url).join(', ');
      console.warn(
        `More than one session found for tab ${tabId}; urls: ${urls}.`
      )
      for (const session of existingSessions.slice(1)) {
        session.endedAt = now;
        await repo.save(session);
      }
    }
    return existingSessions[0];
  }

  async tabChanged(request: TabChangedRequest): Promise<TabChangedResponse> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Session);
      const now = new Date();
      const existingSession = await this.getActiveSession(request.tabId, repo, now);
      let sourceSessionId: string | undefined = undefined;
      const transitionType: string | undefined = request.transitionType || 'link';

      if (
        request.sourceTabId !== undefined &&
        request.sourceTabId !== request.tabId
      ) {
        const sourceSession = await this.getActiveSession(request.sourceTabId, repo, now);
        sourceSessionId = sourceSession?.id;
      }

      if (existingSession) {
        // Check if session hasn't changed.
        const cleanUrl = cleanURL(request.url);
        if (cleanURL(existingSession.url) === cleanUrl) {
          return { code: ServerResponseCode.Ok };
        }
        // Otherwise: use as source unless it's already defined
        if (sourceSessionId === undefined) {
          sourceSessionId = existingSession.id;
        }
        // either way, mark as done; we'll save it later
        existingSession.endedAt = now;
      }

      const newSession = repo.create({
        id: uuidv4(),
        tabId: request.tabId,
        url: cleanURL(request.url),
        rawUrl: request.url,
        host: getHost(request.url),
        title: request.title,
        startedAt: now,
        parentSessionId: sourceSessionId,
        transitionType,
      });

      await repo.save(newSession);

      if (existingSession && sourceSessionId === existingSession.id) {
        existingSession.nextSessionId = newSession.id;
      }
      if (existingSession) {
        await repo.save(existingSession);
      }
      return {};
    });
  }

  async tabClosed(request: TabClosedRequest): Promise<TabClosedResponse> {
    const now = new Date();
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Session);
      const existingSession = await this.getActiveSession(request.tabId, repo, now);
      if (existingSession === undefined) {
        console.warn(`No active session exists for tab ${request.tabId}`);
        return { code: ServerResponseCode.Ok };
      }
      existingSession.endedAt = now;
      await repo.save(existingSession);
      return {};
    });
  }

  async querySessions(request: QuerySessionsRequest): Promise<QuerySessionsResponse> {
    const repo = this.dataSource.getRepository(SessionIndex);
    let builder = await repo
      .createQueryBuilder('s')
      .loadRelationCountAndMap(
        's.childCount',
        's.childSessions',
        'children'
      )
      .orderBy('s.startedAt', 'DESC');

    if (request.query) {
      builder = builder.where('session_index MATCH :query', { query: request.query });
    }

    if (request.filter !== undefined) {
      const [sql, params] = renderClause(
        request.filter,
        (fieldName) => `s.${fieldName}`
      );
      builder = builder.where(sql, params);
    }

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
      results,
    };
  }

  async exportDatabase(request: ExportDatabaseRequest): Promise<ExportDatabaseResponse> {
    const driver = this.dataSource.driver as SqljsDriver;
    const database = new Blob([driver.export()]);
    const databaseUrl = URL.createObjectURL(database);
    return {
      databaseUrl,
    };
  }

  async regenerateIndex(request: RegenerateIndexRequest): Promise<RegenerateIndexResponse> {
    const args = sessionIndexTableArgs(this.dataSource);
    const runner = this.dataSource.createQueryRunner();
    runner.startTransaction()
    await dropFts5Index(args, runner);
    await createFts5Index(args, runner);
    runner.commitTransaction()
    return {};
  }

}
