import { ServerResponseCode } from "./server";
import { Aborted } from "./server/abort";
import { createBackgroundServerRequestProcessor } from "./server/background-client";
import { ServerClient } from "./server/client";
import { JobManager } from "./server/job-manager";
import { setupObservers } from "./extension/utils";

const serverConnection = createBackgroundServerRequestProcessor();
const serverClient = new ServerClient(serverConnection);

const requestTimeout = 60 * 1000;
const jobManager = new JobManager(requestTimeout);

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
    jobManager.abortJob(request.requestId);
    sendResponse('OK');
    return false;
  }
  const { request: innerRequest, requestId } = request;
  jobManager.addJob(requestId, (abortSignal) => {
    return serverConnection({ ...innerRequest, abort: abortSignal });
  });

  jobManager.jobPromise(requestId)
    .then(sendResponse)
    .catch((error) => {
      if (error instanceof Aborted) {
        sendResponse({
          code: ServerResponseCode.Aborted,
          message: 'Aborted',
        });
        return;
      }
      console.trace("Error handling extension request.", error);
      sendResponse({
        code: ServerResponseCode.Error,
        message: error.toString(),
      });
    })
  return true;
});
