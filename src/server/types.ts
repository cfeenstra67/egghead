import type { Clause } from './clause';
import type { Session } from '../models';

export enum ServerMessage {
  Query = 'runQuery',
  TabChanged = 'tabChanged',
  TabClosed = 'tabClosed',
  QuerySessions = 'querySessions',
  ExportDatabase = 'exportDatabase',
  RegenerateIndex = 'regenerateIndex',
}

export enum ServerResponseCode {
  Ok = 'Ok',
  Error = 'Error',
}

export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  result: Record<string, any>[];
}

export interface TabChangedRequest {
  tabId: number;
  url: string;
  title: string;
  sourceTabId?: number;
  transitionType?: string;
}

export interface TabChangedResponse {}

export interface TabClosedRequest {
  tabId: number;
}

export interface TabClosedResponse {}

export interface QuerySessionsRequest {
  query?: string;
  filter?: Clause<Session>;
  skip?: number;
  limit?: number;
}

export interface SessionResponse extends Omit<Session, 'startedAt' | 'endedAt'> {
  childCount: number;
  startedAt: string;
  endedAt?: string;
}

export interface QuerySessionsResponseFacetValue {
  value: string;
  count: number;
}

export interface QuerySessionResponseFacets {
  host: QuerySessionsResponseFacetValue[];
  term: QuerySessionsResponseFacetValue[];
}

export interface QuerySessionsResponse {
  totalCount: number;
  facets: QuerySessionResponseFacets;
  results: SessionResponse[];
}

export interface ExportDatabaseRequest {}

export interface ExportDatabaseResponse {
  databaseUrl: string;
}

export interface RegenerateIndexRequest {}

export interface RegenerateIndexResponse {}

export type ServerMessageMapping = {
  [ServerMessage.Query]: [QueryRequest, QueryResponse];
  [ServerMessage.QuerySessions]: [QuerySessionsRequest, QuerySessionsResponse];
  [ServerMessage.ExportDatabase]: [ExportDatabaseRequest, ExportDatabaseResponse];
  [ServerMessage.RegenerateIndex]: [RegenerateIndexRequest, RegenerateIndexResponse];
  [ServerMessage.TabChanged]: [TabChangedRequest, TabChangedResponse];
  [ServerMessage.TabClosed]: [TabClosedRequest, TabClosedResponse];
};

export type ServerRequestForMessage<T> =
  T extends ServerMessage ? ServerMessageMapping[T][0] : never;

export type TypedServerRequestForMessage<T> =
  T extends ServerMessage ? { type: T } & ServerMessageMapping[T][0] : never;

export type ServerResponseForMessage<T> =
  T extends ServerMessage ? ServerMessageMapping[T][1] : never;

export type ServerResponseForMessageWithCode<T> = (
  T extends ServerMessage ? (
    ServerResponseForMessage<T> & { code: ServerResponseCode.Ok }
  ) : never
) | ErrorResponse;

export type ServerRequest = ServerRequestForMessage<ServerMessage>;

export type ServerResponse = ServerResponseForMessage<ServerMessage>;

export type ServerInterface = {
  [key in keyof ServerMessageMapping as `${key}`]: (
    input: ServerRequestForMessage<key>
  ) => Promise<ServerResponseForMessage<key>>
};

export interface ErrorResponse {
  code: ServerResponseCode.Error;
  message: string;
}

export type RequestHandler =
  <T extends ServerMessage>(
    input: TypedServerRequestForMessage<T>
  ) => Promise<ServerResponseForMessageWithCode<T>>;

export interface WorkerRequest<T extends ServerMessage> {
  requestId: string;
  request: TypedServerRequestForMessage<T>;
}

export interface WorkerResponse<T extends ServerMessage> {
  requestId: string;
  response: ServerResponseForMessageWithCode<T>;
}
