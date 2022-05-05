import type { User } from '../models';

export enum ServerMessage {
  Hello = 'Hello',
  Query = 'Query',
  CreateUser = 'CreateUser',
  GetUsers = 'GetUsers',
}

export enum ServerResponseCode {
  Ok = 'Ok',
  Error = 'Error',
}

export interface HelloRequest {
  type: ServerMessage.Hello;
}

export interface HelloResponse {
  code: ServerResponseCode.Ok;
  message: string;
}

export interface QueryRequest {
  type: ServerMessage.Query;
  query: string;
}

export interface QueryResponse {
  code: ServerResponseCode.Ok;
  result: Record<string, any>[];
}

export interface CreateUserRequest {
  type: ServerMessage.CreateUser;
  name: string;
}

export interface CreateUserResponse {
  code: ServerResponseCode.Ok;
  user: User;
}

export interface GetUsersRequest {
  type: ServerMessage.GetUsers;
}

export interface GetUsersResponse {
  code: ServerResponseCode.Ok;
  users: User[];
}

export interface ServerInterface {

  getHello(request: Omit<HelloRequest, 'type'>): Promise<HelloResponse>;

  runQuery(request: Omit<QueryRequest, 'type'>): Promise<QueryResponse>;

  createUser(request: Omit<CreateUserRequest, 'type'>): Promise<CreateUserResponse>;

  getUsers(request: Omit<GetUsersRequest, 'type'>): Promise<GetUsersResponse>;

}

export interface ErrorResponse {
  code: ServerResponseCode.Error;
  message: string;
}

export type ServerRequest =
  | HelloRequest
  | QueryRequest
  | CreateUserRequest
  | GetUsersRequest;

export type ServerResponse<T> = (
  T extends HelloRequest ? HelloResponse
  : T extends QueryRequest ? QueryResponse
  : T extends CreateUserRequest ? CreateUserResponse
  : T extends GetUsersRequest ? GetUsersResponse
  : never
) | ErrorResponse;

export interface WorkerRequest<T extends ServerRequest> {
  requestId: string;
  request: T;
}

export interface WorkerResponse<T> {
  requestId: string;
  response: ServerResponse<T>;
}
