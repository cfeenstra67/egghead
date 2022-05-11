import type { User, Session } from '../models';
import type { TabSession } from '../extension';

export enum ServerMessage {
  Hello = 'Hello',
  Query = 'Query',
  CreateUser = 'CreateUser',
  GetUsers = 'GetUsers',
  StartSession = 'StartSession',
  EndSession = 'EndSession',
  QuerySessions = 'QuerySessions',
  ExportDatabase = 'ExportDatabase',
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

export interface StartSessionRequest {
  type: ServerMessage.StartSession;
  session: TabSession;
  parentSessionId?: string;
  transitionType?: string;
}

export interface StartSessionResponse {
  code: ServerResponseCode.Ok;
}

export interface EndSessionRequest {
  type: ServerMessage.EndSession;
  session: TabSession;
}

export interface EndSessionResponse {
  code: ServerResponseCode.Ok;
}

export interface QuerySessionsRequest {
  type: ServerMessage.QuerySessions;
  query: string;
  skip?: number;
  limit?: number;
}

export interface SessionResponse extends Omit<Session, 'startedAt' | 'endedAt'> {
  childCount: number;
  startedAt: string;
  endedAt?: string;
}

export interface QuerySessionsResponse {
  code: ServerResponseCode.Ok;
  totalCount: number;
  results: SessionResponse[];
}

export interface ExportDatabaseRequest {
  type: ServerMessage.ExportDatabase;
}

export interface ExportDatabaseResponse {
  code: ServerResponseCode.Ok;
  databaseUrl: string;
}

export interface ServerInterface {

  getHello(request: Omit<HelloRequest, 'type'>): Promise<HelloResponse>;

  runQuery(request: Omit<QueryRequest, 'type'>): Promise<QueryResponse>;

  createUser(request: Omit<CreateUserRequest, 'type'>): Promise<CreateUserResponse>;

  getUsers(request: Omit<GetUsersRequest, 'type'>): Promise<GetUsersResponse>;

  startSession(request: Omit<StartSessionRequest, 'type'>): Promise<StartSessionResponse>;

  endSession(request: Omit<EndSessionRequest, 'type'>): Promise<EndSessionResponse>;

  querySessions(request: Omit<QuerySessionsRequest, 'type'>): Promise<QuerySessionsResponse>;

  exportDatabase(request: Omit<ExportDatabaseRequest, 'type'>): Promise<ExportDatabaseResponse>;
}

export interface ErrorResponse {
  code: ServerResponseCode.Error;
  message: string;
}

export type ServerRequest =
  | HelloRequest
  | QueryRequest
  | CreateUserRequest
  | GetUsersRequest
  | StartSessionRequest
  | EndSessionRequest
  | QuerySessionsRequest
  | ExportDatabaseRequest;

export type ServerResponse<T> = (
  T extends HelloRequest ? HelloResponse
  : T extends QueryRequest ? QueryResponse
  : T extends CreateUserRequest ? CreateUserResponse
  : T extends GetUsersRequest ? GetUsersResponse
  : T extends StartSessionRequest ? StartSessionResponse
  : T extends EndSessionRequest ? EndSessionResponse
  : T extends QuerySessionsRequest ? QuerySessionsResponse
  : T extends ExportDatabaseRequest ? ExportDatabaseResponse
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
