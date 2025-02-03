import parentLogger from './logger';
import { createOffscreenClient } from "./server/offscreen-client";
import { ServerResponseCode } from "./server";
import { Aborted } from "./server/abort";
import { ServerClient } from "./server/client";
import { JobManager } from "./server/job-manager";
import {
  jobManagerMiddleware,
  logRequestMiddleware,
  logJobMiddleware,
  // jobLockingMiddleware,
} from "./server/utils";
import { setupObservers } from './extension/utils';

const logger = parentLogger.child({ context: 'background' });

const serverConnection = createOffscreenClient();
const loggingServerConnection = logRequestMiddleware(serverConnection);
const jobManager = new JobManager({
  middlewares: [logJobMiddleware]
});
const managedConnection = jobManagerMiddleware(loggingServerConnection, jobManager)
const serverClient = new ServerClient(managedConnection);

const observersController = setupObservers(serverClient);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target && request.target !== 'background') {
    return;
  }

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
  if (request.type === 'resetCrawlerState') {
    observersController.resetState().then(() => {
      sendResponse('OK');
    }).catch((error) => {
      logger.error(error);
      sendResponse('ERROR');
    })
    return true;
  }
  const { request: innerRequest, requestId } = request;
  jobManager.addJob(requestId, (abortSignal) => {
    return loggingServerConnection({ ...innerRequest, abort: abortSignal });
  });

  jobManager.jobPromise(requestId)
    .then((response) => {
      sendResponse(response);
    })
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

// chrome.runtime.onSuspend.addListener(async () => {
//   logger.debug('closing');
//   await closeServer();
// });

chrome.runtime.onInstalled.addListener(async () => {
  if (DEV_MODE) {
    await observersController.resetState();
    observersController.runCrawler();
  }
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      throw chrome.runtime.lastError;
    }
    for (const tab of tabs) {
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
    }
  });
});
