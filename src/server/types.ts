import type { Clause } from "./clause";
import type { Session, SettingsItems } from "../models";

export enum ServerMessage {
  Query = "runQuery",
  TabChanged = "tabChanged",
  TabClosed = "tabClosed",
  TabInteraction = "tabInteraction",
  CorrelateChromeVisit = "correlateChromeVisit",
  CreateGhostSessions = "createGhostSessions",
  QuerySessions = "querySessions",
  QuerySessionFacets = "querySessionFacets",
  QuerySessionTimeline = "querySessionTimeline",
  ImportDatabase = "importDatabase",
  ExportDatabase = "exportDatabase",
  RegenerateIndex = "regenerateIndex",
  GetSettings = "getSettings",
  UpdateSettings = "updateSettings",
}

export enum ServerResponseCode {
  Ok = "Ok",
  Error = "Error",
  Aborted = "Aborted",
}

export enum Theme {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark',
}

export interface BaseRequest {
  abort?: AbortSignal;
}

export interface QueryRequest extends BaseRequest {
  query: string;
}

export interface QueryResponse {
  result: Record<string, any>[];
}

export interface TabChangedRequest extends BaseRequest {
  tabId: number;
  url: string;
  title: string;
  sourceTabId?: number;
  transitionType?: string;
}

export interface TabChangedResponse {}

export interface TabClosedRequest extends BaseRequest {
  tabId: number;
}

export interface TabClosedResponse {}

export interface TabInteractionRequest extends BaseRequest {
  tabId: number;
  url?: string;
  title?: string;
}

export interface TabInteractionResponse {}

export interface CorrelateChromeVisitRequest extends BaseRequest {
  sessionId: string;
  visitId: string;
}

export interface CorrelateChromeVisitResponse {}

export interface CreateGhostSessionsRequest extends BaseRequest {
  sessions: {
    visitTime: number;
    visitId: string;
    title: string;
    url: string;
    referringVisitId?: string;
    transition?: string;
  }[];
}

export interface CreateGhostSessionsResponse {}

export interface QuerySessionsRequest extends BaseRequest {
  query?: string;
  filter?: Clause<Session>;
  skip?: number;
  limit?: number;
  isSearch?: boolean;
}

export interface SessionResponse
  extends Omit<Session, "startedAt" | "endedAt"> {
  childCount: number;
  childTransitions: Record<string, string>;
  highlightedTitle: string;
  highlightedHost: string;
  startedAt: string;
  endedAt?: string;
}

export interface QuerySessionsResponse {
  totalCount: number;
  results: SessionResponse[];
}

export interface QuerySessionFacetsRequest extends BaseRequest {
  query?: string;
  filter?: Clause<Session>;
  facetsSize?: number;
}

export interface QuerySessionFacetsFacetValue {
  value: string;
  count: number;
}

export interface QuerySessionFacetsResponse {
  host: QuerySessionFacetsFacetValue[];
  term: QuerySessionFacetsFacetValue[];
}

export interface QuerySessionTimelineRequest extends BaseRequest {
  query?: string;
  filter?: Clause<Session>;
  granularity: "hour" | "day" | "week" | "month" | number;
}

export interface QuerySessionTimelineResponseItem {
  dateString: string;
  count: number;
}

export interface QuerySessionTimelineResponse {
  granularity: QuerySessionTimelineRequest["granularity"] & string;
  timeline: QuerySessionTimelineResponseItem[];
}

export interface ExportDatabaseRequest extends BaseRequest {}

export interface ExportDatabaseResponse {
  databaseUrl: string;
}

export interface ImportDatabaseRequest extends BaseRequest {
  databaseUrl: string;
}

export interface ImportDatabaseResponse {}

export interface RegenerateIndexRequest extends BaseRequest {}

export interface RegenerateIndexResponse {}

export interface GetSettingsRequest extends BaseRequest {}

export interface GetSettingsResponse {
  settings: SettingsItems;
}

export interface UpdateSettingsRequest extends BaseRequest {
  settings: Partial<SettingsItems>;
}

export interface UpdateSettingsResponse {
  settings: SettingsItems;
}

export type ServerMessageMapping = {
  [ServerMessage.Query]: [QueryRequest, QueryResponse];
  [ServerMessage.QuerySessions]: [QuerySessionsRequest, QuerySessionsResponse];
  [ServerMessage.QuerySessionFacets]: [
    QuerySessionFacetsRequest,
    QuerySessionFacetsResponse
  ];
  [ServerMessage.QuerySessionTimeline]: [
    QuerySessionTimelineRequest,
    QuerySessionTimelineResponse
  ];
  [ServerMessage.ExportDatabase]: [
    ExportDatabaseRequest,
    ExportDatabaseResponse
  ];
  [ServerMessage.RegenerateIndex]: [
    RegenerateIndexRequest,
    RegenerateIndexResponse
  ];
  [ServerMessage.TabChanged]: [TabChangedRequest, TabChangedResponse];
  [ServerMessage.TabClosed]: [TabClosedRequest, TabClosedResponse];
  [ServerMessage.TabInteraction]: [TabInteractionRequest, TabInteractionResponse];
  [ServerMessage.CorrelateChromeVisit]: [CorrelateChromeVisitRequest, CorrelateChromeVisitResponse];
  [ServerMessage.CreateGhostSessions]: [CreateGhostSessionsRequest, CreateGhostSessionsResponse];
  [ServerMessage.GetSettings]: [GetSettingsRequest, GetSettingsResponse];
  [ServerMessage.ImportDatabase]: [ImportDatabaseRequest, ImportDatabaseResponse];
  [ServerMessage.UpdateSettings]: [UpdateSettingsRequest, UpdateSettingsResponse];
};

export type ServerRequestForMessage<T> = T extends ServerMessage
  ? ServerMessageMapping[T][0]
  : never;

export type TypedServerRequestForMessage<T> = T extends ServerMessage
  ? { type: T } & ServerMessageMapping[T][0]
  : never;

export type ServerResponseForMessage<T> = T extends ServerMessage
  ? ServerMessageMapping[T][1]
  : never;

export type ServerResponseForMessageWithCode<T> =
  | (T extends ServerMessage
      ? ServerResponseForMessage<T> & { code: ServerResponseCode.Ok }
      : never)
  | ErrorResponse;

export type ServerRequest = ServerRequestForMessage<ServerMessage>;

export type ServerResponse = ServerResponseForMessage<ServerMessage>;

export type ServerInterface = {
  [key in keyof ServerMessageMapping as `${key}`]: (
    input: ServerRequestForMessage<key>
  ) => Promise<ServerResponseForMessage<key>>;
};

export interface ErrorResponse {
  code: ServerResponseCode.Error | ServerResponseCode.Aborted;
  message: string;
}

export type RequestHandler = <T extends ServerMessage>(
  input: TypedServerRequestForMessage<T>
) => Promise<ServerResponseForMessageWithCode<T>>;

export interface WorkerRequest<T extends ServerMessage> {
  type: 'request';
  requestId: string;
  request: Omit<TypedServerRequestForMessage<T>, 'abort'>;
}

export interface WorkerAbortRequest {
  type: 'abort';
  requestId: string;
}

export type WorkerMessage = WorkerRequest<any> | WorkerAbortRequest;

export interface WorkerResponse<T extends ServerMessage> {
  requestId: string;
  response: ServerResponseForMessageWithCode<T>;
}
