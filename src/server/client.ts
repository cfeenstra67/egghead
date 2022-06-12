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
} from "./types";

// For use in a web page
export const processExtensionRequest: RequestHandler = (request) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response) => {
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
    if (response.code === ServerResponseCode.Error) {
      throw new Error(response.message);
    }
    return response;
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

}
