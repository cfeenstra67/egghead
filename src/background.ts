import {
  ServerResponseCode,
  ServerMessage,
  ErrorResponse,
} from './server';
import { createBackgroundServerRequestProcessor } from './server/background-client';
import { ServerClient } from './server/client';
import {
  ExtensionMessage,
  ExtensionRequest,
  ExtensionResponse,
} from './extension';
import { makeRequestProcessor } from './extension/client';
import { ExtensionService } from './extension/service';
import { setupSessionObservers } from './extension/utils';

const serverConnection = createBackgroundServerRequestProcessor();
const serverClient = new ServerClient(serverConnection);

const extensionService = new ExtensionService();
const handleExtensionRequest = makeRequestProcessor(extensionService);

setupSessionObservers(serverClient);

async function handleMessage<T extends ExtensionRequest>(message: T): Promise<ExtensionResponse<T>> {
  if (ServerMessage.hasOwnProperty(message.type)) {
    return await serverConnection(message) as ExtensionResponse<T>;
  }
  if (ExtensionMessage.hasOwnProperty(message.type)) {
    return await handleExtensionRequest(message) as ExtensionResponse<T>;
  }
  const resp: ErrorResponse = {
    code: ServerResponseCode.Error,
    message: `Invalid message type: ${(message as any).type}.`
  };
  return resp;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request as ExtensionRequest)
    .then(sendResponse)
    .catch((error) => {
      console.trace('Error handling extension request.', error);
      sendResponse({
        code: ServerResponseCode.Error,
        message: error.toString(),
      });
    });
  return true;
});
