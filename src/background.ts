import {
  ServerResponseCode,
  ServerMessage,
  ServerRequest,
  ServerResponse,
  ErrorResponse,
} from './server';
import { createBackgroundServerRequestProcessor } from './server/background-client';
import {
  ExtensionMessage,
  ExtensionRequest,
  ExtensionResponse,
  HelloExtensionRequest,
  HelloExtensionResponse,
} from './types';

async function handleHelloRequest(message: HelloExtensionRequest): Promise<HelloExtensionResponse> {
  return { code: ServerResponseCode.Ok, message: `Hello, ${message.message}` };
}

const serverConnection = createBackgroundServerRequestProcessor();

async function handleServerRequest<T extends ServerRequest>(message: T): Promise<ServerResponse<T>> {
  try {
    return await serverConnection(message) as ServerResponse<T>;
  } catch (err) {
    return { code: ServerResponseCode.Error, message: (err as any).toString() };
  }
}

async function handleMessage<T extends ExtensionRequest>(message: T): Promise<ExtensionResponse<T>> {
  switch (message.type) {
    case ExtensionMessage.Hello2:
      return await handleHelloRequest(message) as ExtensionResponse<T>;
    default:
      if (ServerMessage[message.type]) {
        return await handleServerRequest(message) as ExtensionResponse<T>;
      }
      const resp: ErrorResponse = {
        code: ServerResponseCode.Error,
        message: `Invalid message type: ${(message as any).type}.`
      };
      return resp;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request as ExtensionRequest).then(sendResponse);
  return true;
});
