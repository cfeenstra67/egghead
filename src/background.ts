import { ServerResponseCode } from "./server";
import { createBackgroundServerRequestProcessor } from "./server/background-client";
import { ServerClient } from "./server/client";
import { setupObservers } from "./extension/utils";

const serverConnection = createBackgroundServerRequestProcessor();
const serverClient = new ServerClient(serverConnection);
const aborts: Record<string, AbortController> = {};

setupObservers(serverClient);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'me') {
    sendResponse(sender.tab?.id);
    return false;
  }
  if (request.type === 'openTabId') {
    chrome.tabs.update(request.tabId, { active: true }, () => {
      sendResponse('OK');
    });
    return true;
  }
  if (request.type === 'abort') {
    if (aborts[request.requestId]) {
      console.log('aborting', request.requestId);
      aborts[request.requestId].abort();
    }
    sendResponse('OK');
    return false;
  }
  const { request: innerRequest, requestId } = request;
  const abortController = new AbortController();
  aborts[requestId] = abortController;

  serverConnection({ ...innerRequest, abort: abortController.signal })
    .then(sendResponse)
    .catch((error) => {
      console.trace("Error handling extension request.", error);
      sendResponse({
        code: ServerResponseCode.Error,
        message: error.toString(),
      });
    })
    .finally(() => {
      delete aborts[requestId];
    });
  return true;
});
