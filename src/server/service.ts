import chunk from 'lodash/chunk';
import { v4 as uuidv4 } from "uuid";
import { maybeAbort } from './abort';
import parentLogger from '../logger';
import { Session as TypeORMSession, Settings } from "../models";
import { SearchService } from "./search";
import {
  ServerInterface,
  PingRequest,
  PingResponse,
  QueryRequest,
  QueryResponse,
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
  QuerySessionFacetsRequest,
  QuerySessionFacetsResponse,
  QuerySessionTimelineRequest,
  QuerySessionTimelineResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  ImportDatabaseRequest,
  ImportDatabaseResponse,
  TabInteractionRequest,
  TabInteractionResponse,
  CorrelateChromeVisitRequest,
  CorrelateChromeVisitResponse,
  CreateGhostSessionsRequest,
  CreateGhostSessionsResponse,
  FixChromeParentsRequest,
  FixChromeParentsResponse,
  ApplyRetentionPolicyRequest,
  ApplyRetentionPolicyResponse,
} from "./types";
import { cleanURL, getHost, defaultSettings } from "./utils";
import { createQueryBuilder, executeQuery, QueryBuilder, RemoveAnnotations, RemoveRelations, SQLConnection } from './sql-primitives';
import { Insertable } from 'kysely';

type Session = RemoveAnnotations<RemoveRelations<TypeORMSession>>;

type InsertSession = Insertable<RemoveRelations<TypeORMSession>>;

const logger = parentLogger.child({ context: 'service' });

// Source: https://www.codegrepper.com/code-examples/javascript/how+to+convert+data+uri+in+array+buffer
function dataURItoBlob(dataURI: string): Blob {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  const byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

  // write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  const ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  const blob = new Blob([ab], {type: mimeString});
  return blob;
}

const stopHosts = new Set([
  'localhost'
]);
const stopProtocols = new Set([
  'chrome',
  'chrome-extension',
  'moz-extension',
  'about'
]);

function shouldIndex(url: string): boolean {
  const urlObj = new URL(url);
  const cleanedProtocol = urlObj.protocol.slice(0, urlObj.protocol.length - 1);
  return (
    !stopProtocols.has(cleanedProtocol) &&
    !stopHosts.has(urlObj.hostname)
  );
}

// Some arbitrary negative value (so it won't overlap w/ real IDs)
const GhostSessionTabId = -12;

export class Server implements ServerInterface {
  private readonly searchService: SearchService;
  private readonly queryBuilder: QueryBuilder;

  constructor(
    readonly connection: SQLConnection,
  ) {
    this.searchService = new SearchService(connection);
    this.queryBuilder = createQueryBuilder();
  }

  async ping(request: PingRequest): Promise<PingResponse> {
    return {};
  }

  async runQuery(request: QueryRequest): Promise<QueryResponse> {
    const result = await this.connection(request.query);
    return { result: result as any[] };
  }

  private async getActiveSession(
    tabId: number,
    now?: Date,
  ): Promise<Session | undefined> {
    if (now === undefined) {
      now = new Date();
    }

    const existingSessionsBuilder = this.queryBuilder
      .selectFrom('session')
      .selectAll()
      .where('tabId', '=', tabId)
      .where('endedAt', 'is', null)
      .orderBy('startedAt desc');

    const existingSessions = await executeQuery(existingSessionsBuilder, this.connection);

    // End any other active session(s) for the tab; data cleanup
    if (existingSessions.length > 1) {
      const urls = existingSessions.map((session) => session.url).join(", ");
      logger.warn(
        `More than one session found for tab ${tabId}; urls: ${urls}.`
      );
      const ids = existingSessions.slice(1).map((session) => session.id);

      const updateBuilder = this.queryBuilder
        .updateTable('session')
        .where('id', 'in', ids)
        .set({ endedAt: now });

      await executeQuery(updateBuilder, this.connection);
    }
    return existingSessions[0];
  }

  async tabChanged(request: TabChangedRequest): Promise<TabChangedResponse> {
    if (!shouldIndex(request.url)) {
      logger.debug(`Not indexing url: ${request.url}`);
      return {};
    }

    // const repo = manager.getRepository(Session);
    const now = new Date();
    const existingSession = await this.getActiveSession(
      request.tabId,
      now
    );
    maybeAbort(request.abort);
    let sourceSessionId: string | undefined = undefined;
    const transitionType: string | undefined =
      request.transitionType || "link";

    if (
      request.sourceTabId !== undefined &&
      request.sourceTabId !== request.tabId
    ) {
      const sourceSession = await this.getActiveSession(
        request.sourceTabId,
        now
      );
      maybeAbort(request.abort);
      sourceSessionId = sourceSession?.id;
    }

    const existingSessionDiff: Partial<Session> = {};
    if (existingSession) {
      // Check if session hasn't changed.
      const cleanUrl = cleanURL(request.url);
      if (cleanURL(existingSession.url) === cleanUrl) {
        return {};
      }
      // Otherwise: use as source unless it's already defined
      if (sourceSessionId === undefined) {
        sourceSessionId = existingSession.id;
      }
      // either way, mark as done; we'll save it later
      existingSessionDiff.endedAt = now;
    }

    const insertBuilder = this.queryBuilder
      .insertInto('session')
      .values({
        id: uuidv4(),
        tabId: request.tabId,
        url: cleanURL(request.url),
        rawUrl: request.url,
        host: getHost(request.url),
        title: request.title,
        startedAt: now,
        parentSessionId: sourceSessionId,
        transitionType,
        interactionCount: 0,
        lastInteractionAt: now,
      })
      .returningAll();

    insertBuilder.compile()

    const [newSession] = await executeQuery(insertBuilder, this.connection);
    maybeAbort(request.abort);

    if (existingSession && sourceSessionId === existingSession.id) {
      existingSessionDiff.nextSessionId = newSession.id;
    }
    if (existingSession && Object.keys(existingSessionDiff).length > 0) {
      const updateBuilder = this.queryBuilder
        .updateTable('session')
        .where('id', '=', existingSession.id)
        .set(existingSessionDiff);

      await executeQuery(updateBuilder, this.connection);
    }
    return {};
  }

  async tabClosed(request: TabClosedRequest): Promise<TabClosedResponse> {
    const now = new Date();

    const existingSession = await this.getActiveSession(
      request.tabId,
      now
    );
    maybeAbort(request.abort);
    if (existingSession === undefined) {
      logger.warn(`No active session exists for tab ${request.tabId}`);
      return {};
    }

    const updateBuilder = this.queryBuilder
      .updateTable('session')
      .where('id', '=', existingSession.id)
      .set({ endedAt: now });

    await executeQuery(updateBuilder, this.connection);

    return {};
  }

  async tabInteraction(
    request: TabInteractionRequest
  ): Promise<TabInteractionResponse> {
    const now = new Date();

    const existingSession = await this.getActiveSession(
      request.tabId,
      now
    );
    maybeAbort(request.abort);
    if (existingSession === undefined) {
      logger.warn(`No active session exists for tab ${request.tabId}`);
      return {};
    }
    if (!request.url || cleanURL(request.url) !== existingSession.url) {
      logger.warn(`Invalid URL for tab ${request.tabId}.`);
      return {};
    }

    const diff: Partial<Session> = {
      interactionCount: existingSession.interactionCount + 1,
      lastInteractionAt: now,
    }
    if (request.title) {
      diff.title = request.title;
    }
    if (request.url) {
      diff.rawUrl = request.url;
    }

    const updateBuilder = this.queryBuilder
      .updateTable('session')
      .where('id', '=', existingSession.id)
      .set(diff);

    await executeQuery(updateBuilder, this.connection);

    return {};
  }

  async querySessions(
    request: QuerySessionsRequest
  ): Promise<QuerySessionsResponse> {
    return await this.searchService.querySessions(request);
  }

  async querySessionFacets(
    request: QuerySessionFacetsRequest
  ): Promise<QuerySessionFacetsResponse> {
    return await this.searchService.querySessionFacets(request);
  }

  async querySessionTimeline(
    request: QuerySessionTimelineRequest
  ): Promise<QuerySessionTimelineResponse> {
    return await this.searchService.querySessionTimeline(request);
  }

  async exportDatabase(
    request: ExportDatabaseRequest
  ): Promise<ExportDatabaseResponse> {
    throw new Error('not implemented');
  }

  async regenerateIndex(
    request: RegenerateIndexRequest
  ): Promise<RegenerateIndexResponse> {
    throw new Error('not implemented');
  }

  async importDatabase(
    request: ImportDatabaseRequest
  ): Promise<ImportDatabaseResponse> {
    throw new Error('not implemented');
  }

  private async getOrCreateSettings(): Promise<Settings> {
    const existingBuilder = this.queryBuilder
      .selectFrom('settings')
      .selectAll();

    const allItems = await executeQuery(existingBuilder, this.connection);
    if (allItems.length > 1) {
      logger.warn(`Found ${allItems.length} settings items, expecting one. Deleting other.`);
      const ids = allItems.slice(1).map((item) => item.id);

      const deleteBuilder = this.queryBuilder
        .deleteFrom('settings')
        .where('id', 'in', ids);

      await executeQuery(deleteBuilder, this.connection);
    }
    if (allItems.length !== 0) {
      return allItems[0];
    }
    const now = new Date();

    console.log('before?');

    const insertBuilder = this.queryBuilder
      .insertInto('settings')
      .values({
        id: uuidv4(),
        ...defaultSettings(),
        createdAt: now,
        updatedAt: now,
      })
      .returningAll();

    console.log('after?', insertBuilder.compile());

    const [newSettings] = await executeQuery(insertBuilder, this.connection);

    return newSettings;
  }

  async getSettings(
    request: GetSettingsRequest
  ): Promise<GetSettingsResponse> {
    return { settings: await this.getOrCreateSettings() };
  }

  async updateSettings(
    request: UpdateSettingsRequest
  ): Promise<UpdateSettingsResponse> {
    const settings = await this.getOrCreateSettings();
    maybeAbort(request.abort);

    const updateBuilder = this.queryBuilder
      .updateTable('settings')
      .where('id', '=', settings.id)
      .set({ ...request.settings, updatedAt: new Date() })
      .returningAll();
    
    const [newSettings] = await executeQuery(updateBuilder, this.connection);

    return { settings: newSettings };
  }

  async correlateChromeVisit(
    request: CorrelateChromeVisitRequest
  ): Promise<CorrelateChromeVisitResponse> {
    const existingSessionBuilder = this.queryBuilder
      .selectFrom('session')
      .selectAll()
      .where('id', '=', request.sessionId);

    const [existingSession] = await executeQuery(existingSessionBuilder, this.connection);
    maybeAbort(request.abort);
    if (!existingSession) {
      logger.warn(`No session found: ${request.sessionId}`);
      return {};
    }
    if (existingSession.chromeVisitId) {
      if (existingSession.chromeVisitId !== request.visitId) {
        logger.warn(`Session already had a visit id: ${request.sessionId}`);
      }
      return {};
    }

    const diff: Partial<Session> = {};
    diff.chromeVisitId = request.visitId;
    diff.chromeReferringVisitId = request.referringVisitId ?? null;
    if (request.referringVisitId) {
      diff.transitionType = request.transition ?? 'link';
    }

    const updateBuilder = this.queryBuilder
      .updateTable('session')
      .where('id', '=', existingSession.id)
      .set(diff)

    await executeQuery(updateBuilder, this.connection);
    maybeAbort(request.abort);
    // Delete any associated ghost session(s) when we correlate a visit
    // should only be 1, but making this robust to duplicates
    const ghostSessionBuilder = this.queryBuilder
      .selectFrom('session')
      .where('chromeVisitId', '=', request.visitId)
      .where('tabId', '=', GhostSessionTabId)
      .select('id');

    const ghostSessions = await executeQuery(ghostSessionBuilder, this.connection);
    maybeAbort(request.abort);

    const ids = ghostSessions.map((session) => session.id);
    const deleteBuilder = this.queryBuilder
      .deleteFrom('session')
      .where('id', 'in', ids);

    await executeQuery(deleteBuilder, this.connection);
    return {};
  }

  async createGhostSessions(
    request: CreateGhostSessionsRequest
  ): Promise<CreateGhostSessionsResponse> {
    const visitIds = request.sessions.map((session) => session.visitId);
    const referringVisitIds = request.sessions.flatMap((session) => {
      if (session.referringVisitId && session.referringVisitId !== '0') {
        return [session.referringVisitId];
      }
      return [];
    });

    const existingSessionsBuilder = this.queryBuilder
      .selectFrom('session')
      .selectAll()
      .where('chromeVisitId', 'in', visitIds.concat(referringVisitIds))
      .where('tabId', '=', GhostSessionTabId);

    const existingSessions = await executeQuery(existingSessionsBuilder, this.connection);
    maybeAbort(request.abort);

    const existingSessionMap = Object.fromEntries(existingSessions.map((session) => {
      return [session.chromeVisitId, session];
    }));

    const newSessions = request.sessions.flatMap((session) => {
      if (!shouldIndex(session.url)) {
        logger.debug(`Not indexing url: ${session.url}`);
        return [];
      }

      const existingSession = existingSessionMap[session.visitId];
      if (existingSession) {
        const isGhostSession = existingSession.tabId === GhostSessionTabId;
        logger.debug(
          `Session already exists for ${session.visitId}: ` +
          `${existingSession.id}. Ghost: ${isGhostSession}`
        );
        return [];
      }

      let referringSessionId: string | undefined = undefined;
      let referringSessionTransition: string | undefined = undefined;
      if (session.referringVisitId && session.referringVisitId !== '0') {
        referringSessionTransition = session.transition ?? 'link';
        const referringSession = existingSessionMap[session.referringVisitId];
        if (referringSession) {
          referringSessionId = referringSession.id;
        } else {
          logger.debug(`No session found for visit: ${session.referringVisitId}`);
        }
      }

      const visitDate = new Date(session.visitTime);

      const newSession: InsertSession = {
        id: uuidv4(),
        tabId: GhostSessionTabId,
        url: cleanURL(session.url),
        rawUrl: session.url,
        host: getHost(session.url),
        title: session.title,
        startedAt: visitDate,
        endedAt: visitDate,
        parentSessionId: referringSessionId,
        transitionType: referringSessionTransition,
        interactionCount: 0,
        lastInteractionAt: visitDate,
        chromeVisitId: session.visitId,
        chromeReferringVisitId: session.referringVisitId,
      };

      return [newSession];
    });

    logger.debug(`Saving ${newSessions.length} sessions`);
    const chunkSize = 100;
    for (const sessions of chunk(newSessions, chunkSize)) {
      const insertBuilder = this.queryBuilder
        .insertInto('session')
        .values(sessions);

      await executeQuery(insertBuilder, this.connection);
    }

    return {};
  }

  async fixChromeParents(
    request: FixChromeParentsRequest
  ): Promise<FixChromeParentsResponse> {
    const limit = 2500;
    const query = `
      update session
      set parentSessionId = updates.sessionId
      from (
        select
          s.id as sessionId,
          s2.id as parentSessionId
        from
          session s
          LEFT JOIN session s2 ON s2.chromeVisitId = s.chromeReferringVisitId
        where
          s.chromeReferringVisitId is not null
          and s.parentSessionId is null
          and s2.id is not null
          and s2.id is not s.id
          and s.tabId = ${GhostSessionTabId}
          and s2.tabId = ${GhostSessionTabId}
          and s.url != s2.url
        limit ${limit}
      ) updates
      where id = updates.sessionId
      returning id
    `;

    let done = false;
    let total = 0;
    while (!done) {
      const results = await this.connection(query);
      logger.debug(`Fixed ${results.length} chrome parents`);
      total += results.length;
      done = results.length < limit;
    }

    if (total > 0) {
      logger.info(`Fixed ${total} total chrome parents`);
    }
    return {};
  }

  async applyRetentionPolicy(request: ApplyRetentionPolicyRequest): Promise<ApplyRetentionPolicyResponse> {
    const settings = await this.getOrCreateSettings();

    const now = new Date();
    const interval = settings.retentionPolicyMonths * 30 * 24 * 60 * 60 * 1000;
    const policyStart = new Date(now.getTime() - interval);

    const deleteBuilder = this.queryBuilder
      .deleteFrom('session')
      .where('startedAt', '<', policyStart);

    await executeQuery(deleteBuilder, this.connection);

    return {};
  }

}
