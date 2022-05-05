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

}
