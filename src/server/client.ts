import { v4 as uuidv4 } from 'uuid';
import { Aborted } from './abort';
import {
  ServerMessage,
  ServerResponseCode,
} from './types';
import type {
  ServerInterface,
  TypedServerRequestForMessage,
  ServerResponseForMessage,
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
  RequestHandler,
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

// For use in a web page
export const processExtensionRequest: RequestHandler = (request) => {
  // Abort won't work yet :(
  const { abort, ...baseRequest } = request;
  const requestId = uuidv4();

  abort?.addEventListener('abort', () => {
    chrome.runtime.sendMessage({ type: 'abort', requestId });
  });

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ requestId, request: baseRequest }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
};

export class ServerClient implements ServerInterface {
  constructor(readonly processRequest: RequestHandler) {}

  private async sendRequestAndRaiseForError<T extends ServerMessage>(
    request: TypedServerRequestForMessage<T>
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
      ...request
    });
  }

  async runQuery(request: QueryRequest): Promise<QueryResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.Query,
      ...request,
    });
  }

  async querySessions(
    request: QuerySessionsRequest
  ): Promise<QuerySessionsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.QuerySessions,
      ...request,
    });
  }

  async exportDatabase(
    request: ExportDatabaseRequest
  ): Promise<ExportDatabaseResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ExportDatabase,
      ...request,
    });
  }

  async regenerateIndex(
    request: RegenerateIndexRequest
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
    request: QuerySessionFacetsRequest
  ): Promise<QuerySessionFacetsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.QuerySessionFacets,
      ...request,
    });
  }

  async querySessionTimeline(
    request: QuerySessionTimelineRequest
  ): Promise<QuerySessionTimelineResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.QuerySessionTimeline,
      ...request,
    });
  }

  async getSettings(
    request: GetSettingsRequest
  ): Promise<GetSettingsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.GetSettings,
      ...request
    });
  }

  async updateSettings(
    request: UpdateSettingsRequest
  ): Promise<UpdateSettingsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.UpdateSettings,
      ...request
    });
  }

  async importDatabase(
    request: ImportDatabaseRequest
  ): Promise<ImportDatabaseResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ImportDatabase,
      ...request
    });
  }

  async tabInteraction(
    request: TabInteractionRequest
  ): Promise<TabInteractionResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.TabInteraction,
      ...request
    });
  }

  async correlateChromeVisit(
    request: CorrelateChromeVisitRequest
  ): Promise<CorrelateChromeVisitResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.CorrelateChromeVisit,
      ...request
    });
  }

  async createGhostSessions(
    request: CreateGhostSessionsRequest
  ): Promise<CreateGhostSessionsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.CreateGhostSessions,
      ...request,
    });
  }

  async fixChromeParents(
    request: FixChromeParentsRequest
  ): Promise<FixChromeParentsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.FixChromeParents,
      ...request
    });
  }

  async applyRetentionPolicy(request: ApplyRetentionPolicyRequest): Promise<ApplyRetentionPolicyResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ApplyRetentionPolicy,
      ...request
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
