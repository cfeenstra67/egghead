import {
  ServerResponseCode,
  ServerMessage,
  ServerRequest,
  ServerResponse,
  ErrorResponse,
} from './server';

export interface ErrorExtensionResponse {
  code: ServerResponseCode.Error;
  message: string;
}

export enum ExtensionMessage {
  Hello2 = 'Hello2',
}

export interface HelloExtensionRequest {
  type: ExtensionMessage.Hello2;
  message: string;
}

export interface HelloExtensionResponse {
  code: ServerResponseCode.Ok;
  message: string;
}

export type ExtensionRequest =
  | HelloExtensionRequest
  | ServerRequest;

export type ExtensionResponse<T> = (
  T extends HelloExtensionRequest ? HelloExtensionResponse
  : T extends ServerRequest ? ServerResponse<T>
  : never
) | ErrorResponse;
