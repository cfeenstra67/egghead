import { Aborted } from './abort';
import {
  ServerInterface,
  TypedServerRequestForMessage,
  ServerResponseForMessage,
  ServerMessage,
  ServerResponseCode,
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
} from "./types";

// For use in a web page
export const processExtensionRequest: RequestHandler = (request) => {
  // Abort won't work yet :(
  const { abort, ...baseRequest } = request;
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(baseRequest, (response) => {
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
    throw new Error(response.message);
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

}
