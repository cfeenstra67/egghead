import chunk from 'lodash/chunk';
import { DataSource, Repository, IsNull, In, LessThan } from "typeorm";
import { SqljsDriver } from "typeorm/driver/sqljs/SqljsDriver";
import { v4 as uuidv4 } from "uuid";
import { maybeAbort } from './abort';
import parentLogger from '../logger';
import { Session, SessionIndex, SessionTermIndex, Settings } from "../models";
import { createFts5Index, dropFts5Index } from "../models/fts5";
import { SearchService, sessionIndexTableArgs } from "./search";
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
import { cleanURL, getHost, defaultSettings, dateToSqliteString } from "./utils";

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
  'moz-extension'
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
  private searchService: SearchService;

  constructor(
    readonly dataSource: DataSource,
    readonly importDb: (database: Uint8Array) => Promise<void>,
  ) {
    this.searchService = new SearchService(dataSource);
  }

  async ping(request: PingRequest): Promise<PingResponse> {
    return {};
  }

  async runQuery(request: QueryRequest): Promise<QueryResponse> {
    const result = await this.dataSource.manager.query(request.query);
    return { result };
  }

  private async getActiveSession(
    tabId: number,
    repo: Repository<Session>,
    now?: Date,
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
        startedAt: "DESC",
      },
    });
    // End any other active session(s) for the tab; data cleanup
    if (existingSessions.length > 1) {
      const urls = existingSessions.map((session) => session.url).join(", ");
      logger.warn(
        `More than one session found for tab ${tabId}; urls: ${urls}.`
      );
      for (const session of existingSessions.slice(1)) {
        session.endedAt = now;
        await repo.save(session);
      }
    }
    return existingSessions[0];
  }

  async tabChanged(request: TabChangedRequest): Promise<TabChangedResponse> {
    if (!shouldIndex(request.url)) {
      logger.debug(`Not indexing url: ${request.url}`);
      return {};
    }

    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Session);
      const now = new Date();
      const existingSession = await this.getActiveSession(
        request.tabId,
        repo,
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
          repo,
          now
        );
        maybeAbort(request.abort);
        sourceSessionId = sourceSession?.id;
      }

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
        interactionCount: 0,
        lastInteractionAt: now,
      });

      await repo.save(newSession);
      maybeAbort(request.abort);

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
      const existingSession = await this.getActiveSession(
        request.tabId,
        repo,
        now
      );
      maybeAbort(request.abort);
      if (existingSession === undefined) {
        logger.warn(`No active session exists for tab ${request.tabId}`);
        return {};
      }
      existingSession.endedAt = now;
      await repo.save(existingSession);
      return {};
    });
  }

  async tabInteraction(
    request: TabInteractionRequest
  ): Promise<TabInteractionResponse> {
    const now = new Date();
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Session);
      const existingSession = await this.getActiveSession(
        request.tabId,
        repo,
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

      existingSession.interactionCount += 1;
      existingSession.lastInteractionAt = now;
      if (request.title) {
        existingSession.title = request.title;
      }
      if (request.url) {
        existingSession.rawUrl = request.url;
      }
      await manager.save(existingSession);
      return {}
    });
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
    const driver = this.dataSource.driver as SqljsDriver;
    const database = new Blob([driver.export()]);
    const databaseUrl = URL.createObjectURL(database);
    return {
      databaseUrl,
    };
  }

  async regenerateIndex(
    request: RegenerateIndexRequest
  ): Promise<RegenerateIndexResponse> {
    const searchIndexArgs = sessionIndexTableArgs(
      this.dataSource,
      SessionIndex,
      "trigram"
    );
    const termIndexArgs = sessionIndexTableArgs(
      this.dataSource,
      SessionTermIndex
    );

    const runner = this.dataSource.createQueryRunner();
    await runner.startTransaction();

    for (const args of [searchIndexArgs, termIndexArgs]) {
      await dropFts5Index(args, runner);
      maybeAbort(request.abort);
      await createFts5Index(args, runner);
      maybeAbort(request.abort);
    }

    await runner.commitTransaction();
    return {};
  }

  private async getOrCreateSettings(repo: Repository<Settings>): Promise<Settings> {
    const allItems = await repo.find();
    if (allItems.length > 1) {
      logger.warn(`Found ${allItems.length} settings items, expecting one. Deleting other.`);
      for (const item of allItems.slice(1)) {
        await repo.delete(item);
      }
    }
    if (allItems.length !== 0) {
      return allItems[0];
    }
    const now = new Date();
    const settings = repo.create({
      ...defaultSettings(),
      createdAt: now,
      updatedAt: now,
    });
    await repo.save(settings);
    return settings;
  }

  async getSettings(
    request: GetSettingsRequest
  ): Promise<GetSettingsResponse> {
    const repo = this.dataSource.getRepository(Settings);
    return { settings: await this.getOrCreateSettings(repo) };
  }

  async updateSettings(
    request: UpdateSettingsRequest
  ): Promise<UpdateSettingsResponse> {
    const repo = this.dataSource.getRepository(Settings);
    const settings = await this.getOrCreateSettings(repo);
    maybeAbort(request.abort);
    Object.assign(settings, request.settings);
    settings.updatedAt = new Date();
    await repo.save(settings);
    return { settings };
  }

  async importDatabase(
    request: ImportDatabaseRequest
  ): Promise<ImportDatabaseResponse> {
    const blob = dataURItoBlob(request.databaseUrl);
    const array = new Uint8Array(await blob.arrayBuffer());
    await this.importDb(array);
    return {};
  }

  async correlateChromeVisit(
    request: CorrelateChromeVisitRequest
  ): Promise<CorrelateChromeVisitResponse> {
    return await this.dataSource.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Session);
      const existingSession = await repo.findOne({
        where: { id: request.sessionId },
      });
      maybeAbort(request.abort);
      if (existingSession === null) {
        logger.warn(`No session found: ${request.sessionId}`);
        return {};
      }
      if (existingSession.chromeVisitId) {
        if (existingSession.chromeVisitId !== request.visitId) {
          logger.warn(`Session already had a visit id: ${request.sessionId}`);
        }
        return {};
      }
      existingSession.chromeVisitId = request.visitId;
      existingSession.chromeReferringVisitId = request.referringVisitId;
      if (request.referringVisitId) {
        existingSession.transitionType = request.transition ?? 'link';
      }
      await manager.save(existingSession);
      maybeAbort(request.abort);
      // Delete any associated ghost session(s) when we correlate a visit
      // should only be 1, but making this robust to duplicates
      const ghostSessions = await repo.find({
        where: {
          chromeVisitId: request.visitId,
          tabId: GhostSessionTabId,
        }
      });
      maybeAbort(request.abort);
      for (const session of ghostSessions) {
        await manager.remove(session);
        maybeAbort(request.abort);
      }
      return {};
    });
  }

  async createGhostSessions(
    request: CreateGhostSessionsRequest
  ): Promise<CreateGhostSessionsResponse> {
    return await this.dataSource.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Session);

      const visitIds = request.sessions.map((session) => session.visitId);
      const referringVisitIds = request.sessions.flatMap((session) => {
        if (session.referringVisitId && session.referringVisitId !== '0') {
          return [session.referringVisitId];
        }
        return [];
      });

      const existingSessions = await repo.find({
        where: {
          chromeVisitId: In(visitIds.concat(referringVisitIds)),
          tabId: GhostSessionTabId,
        }
      });
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
        const newSession = repo.create({
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
        });
        return [newSession];
      });

      logger.debug(`Saving ${newSessions.length} sessions`);
      const chunkSize = 100;
      for (const sessions of chunk(newSessions, chunkSize)) {
        await manager.save(sessions);
      }

      return {};
    });
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
      const results = await this.dataSource.query(query);
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
    return await this.dataSource.manager.transaction(async (manager) => {
      const settingsRepo = manager.getRepository(Settings);
      const settings = await this.getOrCreateSettings(settingsRepo);

      const now = new Date();
      const interval = settings.retentionPolicyMonths * 30 * 24 * 60 * 60 * 1000;
      const policyStart = new Date(now.getTime() - interval);

      const sessionRepo = manager.getRepository(Session);
      await sessionRepo.delete({ startedAt: LessThan(policyStart) });

      return {};
    });
  }

}
