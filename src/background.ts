import { ServerResponseCode } from "./server";
import { Aborted } from "./server/abort";
import { createBackgroundClient } from "./server/background-client";
import { ServerClient } from "./server/client";
import { JobManager } from "./server/job-manager";
import { jobManagerMiddleware } from "./server/utils";
import { setupObservers } from "./extension/utils";

const { handle: serverConnection, close: closeServer } = createBackgroundClient();
const requestTimeout = 10 * 1000;
const jobManager = new JobManager(requestTimeout);

const managedConnection = jobManagerMiddleware(serverConnection, jobManager);
const serverClient = new ServerClient(managedConnection);

const resetObservers = setupObservers(serverClient);

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

chrome.runtime.onSuspend.addListener(async () => {
  console.log('closing');
  await closeServer();
});

chrome.runtime.onInstalled.addListener(() => {
  // TODO: probably need to remove this
  resetObservers();
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      throw chrome.runtime.lastError;
    }
    tabs.forEach((tab) => {
      if (tab.id !== undefined && !tab.url?.startsWith('chrome://')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js'],
        });
      }
    });
  });
});
