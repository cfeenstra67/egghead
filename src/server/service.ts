import { Session, SessionIndex, SessionTermIndex, Settings, defaultSettings } from "../models";
import { createFts5Index, dropFts5Index } from "../models/fts5";
import { SearchService, sessionIndexTableArgs } from "./search";
import {
  ServerInterface,
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
} from "./types";
import { cleanURL, getHost } from "./utils";
import { DataSource, Repository, IsNull } from "typeorm";
import { SqljsDriver } from "typeorm/driver/sqljs/SqljsDriver";
import { v4 as uuidv4 } from "uuid";

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

export class Server implements ServerInterface {
  private searchService: SearchService;

  constructor(
    readonly dataSource: DataSource,
    readonly importDb: (database: Uint8Array) => Promise<void>,
  ) {
    this.searchService = new SearchService(dataSource);
  }

  async runQuery(request: Omit<QueryRequest, "type">): Promise<QueryResponse> {
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
        startedAt: "DESC",
      },
    });
    // End any other active session(s) for the tab; data cleanup
    if (existingSessions.length > 1) {
      const urls = existingSessions.map((session) => session.url).join(", ");
      console.warn(
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
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Session);
      const now = new Date();
      const existingSession = await this.getActiveSession(
        request.tabId,
        repo,
        now
      );
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
      if (existingSession === undefined) {
        console.warn(`No active session exists for tab ${request.tabId}`);
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
      if (existingSession === undefined) {
        console.warn(`No active session exists for tab ${request.tabId}`);
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
      await createFts5Index(args, runner);
    }

    await runner.commitTransaction();
    return {};
  }

  private async getOrCreateSettings(repo: Repository<Settings>): Promise<Settings> {
    const allItems = await repo.find();
    if (allItems.length > 1) {
      console.warn(`Found ${allItems.length} settings items, expecting one. Deleting other.`);
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

}
