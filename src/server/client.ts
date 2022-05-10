import {
  ServerInterface,
  ServerRequest,
  ServerResponse,
  ServerMessage,
  HelloRequest,
  HelloResponse,
  ServerResponseCode,
  QueryRequest,
  QueryResponse,
  CreateUserRequest,
  CreateUserResponse,
  GetUsersRequest,
  GetUsersResponse,
  StartSessionRequest,
  StartSessionResponse,
  EndSessionRequest,
  EndSessionResponse,
  QuerySessionsRequest,
  QuerySessionsResponse,
  ExportDatabaseRequest,
  ExportDatabaseResponse,
} from './types';

export type RequestProcessor<T extends ServerRequest> = (request: T) => Promise<ServerResponse<T>>;

export class ServerClient implements ServerInterface {

  constructor(readonly processRequest: RequestProcessor<any>) {}

  private async sendRequestAndRaiseForError<T extends ServerRequest>(request: T): Promise<ServerResponse<T>> {
    const response = await this.processRequest(request) as ServerResponse<T>;
    if (response.code === ServerResponseCode.Error) {
      throw new Error(response.message);
    }
    return response;
  }

  async getHello(request: Omit<HelloRequest, 'type'>): Promise<HelloResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.Hello,
      ...request
    }) as HelloResponse;
  }

  async runQuery(request: Omit<QueryRequest, 'type'>): Promise<QueryResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.Query,
      ...request
    }) as QueryResponse;
  }

  async createUser(request: Omit<CreateUserRequest, 'type'>): Promise<CreateUserResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.CreateUser,
      ...request
    }) as CreateUserResponse;
  }

  async getUsers(request: Omit<GetUsersRequest, 'type'>): Promise<GetUsersResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.GetUsers,
      ...request
    }) as GetUsersResponse;
  }

  async startSession(request: Omit<StartSessionRequest, 'type'>): Promise<StartSessionResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.StartSession,
      ...request
    }) as StartSessionResponse;
  }

  async endSession(request: Omit<EndSessionRequest, 'type'>): Promise<EndSessionResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.EndSession,
      ...request
    }) as EndSessionResponse;
  }

  async querySessions(request: Omit<QuerySessionsRequest, 'type'>): Promise<QuerySessionsResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.QuerySessions,
      ...request
    }) as QuerySessionsResponse;
  }
  
  async exportDatabase(request: Omit<ExportDatabaseRequest, 'type'>): Promise<ExportDatabaseResponse> {
    return await this.sendRequestAndRaiseForError({
      type: ServerMessage.ExportDatabase,
      ...request
    }) as ExportDatabaseResponse;
  }

}
