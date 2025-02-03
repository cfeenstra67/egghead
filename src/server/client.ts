import { v4 as uuidv4 } from "uuid";
import { Aborted } from "./abort";
import { ServerMessage, ServerResponseCode } from "./types";
import type {
  ApplyRetentionPolicyRequest,
  ApplyRetentionPolicyResponse,
  CorrelateChromeVisitRequest,
  CorrelateChromeVisitResponse,
  CreateGhostSessionsRequest,
  CreateGhostSessionsResponse,
  ExportDatabaseRequest,
  ExportDatabaseResponse,
  FixChromeParentsRequest,
  FixChromeParentsResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  ImportDatabaseRequest,
  ImportDatabaseResponse,
  PingRequest,
  PingResponse,
  QueryRequest,
  QueryResponse,
  QuerySessionFacetsRequest,
  QuerySessionFacetsResponse,
  QuerySessionTimelineRequest,
  QuerySessionTimelineResponse,
  QuerySessionsRequest,
  QuerySessionsResponse,
  RegenerateIndexRequest,
  RegenerateIndexResponse,
  RequestHandler,
  ServerInterface,
  ServerResponseForMessage,
  TabChangedRequest,
  TabChangedResponse,
  TabClosedRequest,
  TabClosedResponse,
  TabInteractionRequest,
  TabInteractionResponse,
  TypedServerRequestForMessage,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from "./types";

// For use in a web page or from background to offscreen communication
export function createExtensionRequestProcessor(
  target: "background" | "offscreen",
): RequestHandler {
  return (request) => {
    const { abort, ...baseRequest } = request;
    const requestId = uuidv4();

    abort?.addEventListener("abort", () => {
      chrome.runtime.sendMessage({ type: "abort", requestId, target });
    });

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { requestId, request: baseRequest, target },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        },
      );
    });
  };
}

export class ServerClient implements ServerInterface {
  constructor(readonly processRequest: RequestHandler) {}

  private async sendRequestAndRaiseForError<T extends ServerMessage>(
    request: TypedServerRequestForMessage<T>,
  ): Promise<ServerResponseForMessage<T>> {
    const response = await this.processRequest(request);
    if (response.code === ServerResponseCode.Ok) {
      return response;
    }
    if (response.code === ServerResponseCode.Aborted) {
      throw new Aborted();
    }
    throw new ServerError(response.message, response.stack);
  }

  async ping(request: PingRequest): Promise<PingResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.Ping,
      ...request,
    });
  }

  async runQuery(request: QueryRequest): Promise<QueryResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.Query,
      ...request,
    });
  }

  async querySessions(
    request: QuerySessionsRequest,
  ): Promise<QuerySessionsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.QuerySessions,
      ...request,
    });
  }

  async exportDatabase(
    request: ExportDatabaseRequest,
  ): Promise<ExportDatabaseResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ExportDatabase,
      ...request,
    });
  }

  async resetDatabase(request: {}): Promise<{}> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ResetDatabase,
      ...request,
    });
  }

  async regenerateIndex(
    request: RegenerateIndexRequest,
  ): Promise<RegenerateIndexResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.RegenerateIndex,
      ...request,
    });
  }

  async tabChanged(request: TabChangedRequest): Promise<TabChangedResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.TabChanged,
      ...request,
    });
  }

  async tabClosed(request: TabClosedRequest): Promise<TabClosedResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.TabClosed,
      ...request,
    });
  }

  async querySessionFacets(
    request: QuerySessionFacetsRequest,
  ): Promise<QuerySessionFacetsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.QuerySessionFacets,
      ...request,
    });
  }

  async querySessionTimeline(
    request: QuerySessionTimelineRequest,
  ): Promise<QuerySessionTimelineResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.QuerySessionTimeline,
      ...request,
    });
  }

  async getSettings(request: GetSettingsRequest): Promise<GetSettingsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.GetSettings,
      ...request,
    });
  }

  async updateSettings(
    request: UpdateSettingsRequest,
  ): Promise<UpdateSettingsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.UpdateSettings,
      ...request,
    });
  }

  async importDatabase(
    request: ImportDatabaseRequest,
  ): Promise<ImportDatabaseResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ImportDatabase,
      ...request,
    });
  }

  async tabInteraction(
    request: TabInteractionRequest,
  ): Promise<TabInteractionResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.TabInteraction,
      ...request,
    });
  }

  async correlateChromeVisit(
    request: CorrelateChromeVisitRequest,
  ): Promise<CorrelateChromeVisitResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.CorrelateChromeVisit,
      ...request,
    });
  }

  async createGhostSessions(
    request: CreateGhostSessionsRequest,
  ): Promise<CreateGhostSessionsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.CreateGhostSessions,
      ...request,
    });
  }

  async fixChromeParents(
    request: FixChromeParentsRequest,
  ): Promise<FixChromeParentsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.FixChromeParents,
      ...request,
    });
  }

  async applyRetentionPolicy(
    request: ApplyRetentionPolicyRequest,
  ): Promise<ApplyRetentionPolicyResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ApplyRetentionPolicy,
      ...request,
    });
  }
}

export class ServerError extends Error {
  constructor(message: string, stack?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    if (stack !== undefined) {
      this.stack = stack;
    }
  }
}
