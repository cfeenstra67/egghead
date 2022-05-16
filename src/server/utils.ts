import {
  ServerMessage,
  ErrorResponse,
  ServerResponseCode,
  TypedServerRequestForMessage,
  ServerInterface,
  RequestHandler,
} from './types';

export function cleanURL(uri: string): string {
  const urlObj = new URL(uri);
  urlObj.search = '';
  urlObj.hash = '';
  return urlObj.href;
}

export function getHost(uri: string): string {
  const urlObj = new URL(uri);
  return urlObj.hostname;
}

export function requestHandler(
  server: ServerInterface
): RequestHandler {
  return async <T extends ServerMessage>(input: TypedServerRequestForMessage<T>) => {
    const method = server[input.type]?.bind(server);
    if (method === undefined) {
      return {
        code: ServerResponseCode.Error,
        message: `Invalid method ${input.type}.`
      };
    }
    try {
      const response = await method(input as any);
      return { code: ServerResponseCode.Ok, ...response };
    } catch (err: any) {
      let message: string;
      if (err === null && err === undefined) {
        message = ''
      } else if (err.stack !== undefined) {
        message = err.stack;
      } else {
        message = err.toString();
      }
      const response: ErrorResponse = {
        code: ServerResponseCode.Error,
        message,
      }
      return response as any;
    };
  };
}
