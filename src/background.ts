import { setupObservers } from "./extension/utils";
import parentLogger from './logger';
import { ServerResponseCode } from "./server";
import { Aborted } from "./server/abort";
import { createBackgroundClient } from "./server/background-client";
import { ServerClient } from "./server/client";
import { JobManager } from "./server/job-manager";
import {
  jobManagerMiddleware,
  logRequestMiddleware,
  logJobMiddleware,
  jobLockingMiddleware,
} from "./server/utils";

const logger = parentLogger.child({ context: 'background' });

const { handle: serverConnection, close: closeServer } = createBackgroundClient();
const loggingServerConnection = logRequestMiddleware(serverConnection);
const jobManager = new JobManager({
  middlewares: [logJobMiddleware, jobLockingMiddleware('background-jobs')]
});
const managedConnection = jobManagerMiddleware(loggingServerConnection, jobManager)
const serverClient = new ServerClient(managedConnection);

const observersController = setupObservers(serverClient);

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
  if (request.type === 'maybeRestartCrawler') {
    observersController.maybeRunCrawler();
    sendResponse('OK');
    return false;
  }
  const { request: innerRequest, requestId } = request;
  jobManager.addJob(requestId, (abortSignal) => {
    return loggingServerConnection({ ...innerRequest, abort: abortSignal });
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
      logger.trace("Error handling extension request.", error);
      sendResponse({
        code: ServerResponseCode.Error,
        message: error.toString(),
        stack: error.stack,
      });
    })
  return true;
});

chrome.runtime.onSuspend.addListener(async () => {
  logger.debug('closing');
  await closeServer();
});

chrome.runtime.onInstalled.addListener(async () => {
  if (DEV_MODE) {
    await observersController.resetState();
    observersController.runCrawler();
  }
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      throw chrome.runtime.lastError;
    }
    tabs.forEach((tab) => {
      if (
        tab.id !== undefined &&
        !tab.url?.startsWith('chrome://')
      ) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js'],
        }, () => {
          if (chrome.runtime.lastError) {
            logger.warn(
              'error executing content script on %s: %s',
              tab.url,
              chrome.runtime.lastError
            );
          }
        });
      }
    });
  });
});
