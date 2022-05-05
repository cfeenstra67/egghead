
export enum ServerMessage {
  Hello = 'Hello',
  Query = 'Query',
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

export interface ServerInterface {

  getHello(request: Omit<HelloRequest, 'type'>): Promise<HelloResponse>;

  runQuery(request: Omit<QueryRequest, 'type'>): Promise<QueryResponse>;

}

export interface ErrorResponse {
  code: ServerResponseCode.Error;
  message: string;
}

export type ServerRequest =
  | HelloRequest
  | QueryRequest;

export type ServerResponse<T> = (
  T extends HelloRequest ? HelloResponse
  : T extends QueryRequest ? QueryResponse
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
