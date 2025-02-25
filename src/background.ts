import { setupObservers } from "./extension/utils";
import parentLogger from "./logger";
import { ServerResponseCode } from "./server";
import { Aborted } from "./server/abort";
import { createServerClient } from "./server/client";
import { JobManager } from "./server/job-manager";
import { createOffscreenClient } from "./server/offscreen-client";
import {
  deleteSessions,
  jobManagerMiddleware,
  logJobMiddleware,
  logRequestMiddleware,
} from "./server/utils";

const logger = parentLogger.child({ context: "background" });

const serverConnection = createOffscreenClient();
const loggingServerConnection = logRequestMiddleware(serverConnection);
const jobManager = new JobManager({
  middlewares: [logJobMiddleware],
});
const managedConnection = jobManagerMiddleware(
  loggingServerConnection,
  jobManager,
);
const serverClient = createServerClient(managedConnection);

const observersController = setupObservers(serverClient);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target && request.target !== "background") {
    return;
  }

  if (request.type === "me") {
    sendResponse(sender.tab?.id);
    return false;
  }
  if (request.type === "openTabId") {
    chrome.tabs.update(request.tabId, { active: true }, () => {
      sendResponse("OK");
    });
    return true;
  }
  if (request.type === "abort") {
    jobManager.abortJob(request.requestId);
    sendResponse("OK");
    return false;
  }
  if (request.type === "maybeRestartCrawler") {
    observersController.maybeRunCrawler();
    sendResponse("OK");
    return false;
  }
  if (request.type === "resetCrawlerState") {
    observersController
      .resetState()
      .then(() => {
        sendResponse("OK");
      })
      .catch((error) => {
        logger.error(error);
        sendResponse("ERROR");
      });
    return true;
  }

  const handleError = (error: any) => {
    if (error instanceof Aborted) {
      sendResponse({
        code: ServerResponseCode.Aborted,
        message: "Aborted",
      });
      return;
    }
    logger.trace("Error handling extension request.", error);
    sendResponse({
      code: ServerResponseCode.Error,
      message: error.toString(),
      stack: error.stack,
    });
  };

  const { request: innerRequest, requestId } = request;

  // Need to intercept this to implement the chrome deletion part
  // since we cannot acccess chrome APIs in the worker.
  if (innerRequest.type === "deleteSessions") {
    const { type, ...args } = innerRequest;
    deleteSessions(serverClient, args)
      .then((response) =>
        sendResponse({
          code: ServerResponseCode.Ok,
          ...response,
        }),
      )
      .catch(handleError);

    return true;
  }

  jobManager.addJob(requestId, (abortSignal) => {
    return loggingServerConnection({ ...innerRequest, abort: abortSignal });
  });

  jobManager
    .jobPromise(requestId)
    .then((response) => sendResponse(response))
    .catch(handleError);

  return true;
});

chrome.commands.onCommand.addListener((cmd, tab) => {
  if (cmd !== "open-history") {
    return;
  }
  const urls = ["chrome://history", "brave://history"];
  chrome.tabs
    .query({})
    .then(async (tabs) => {
      const tabsWithIds = tabs.filter(
        (t) => !!t.id && t.url && urls.some((u) => t.url!.startsWith(u)),
      );
      console.log("tags", tabs, tabsWithIds);
      if (tabsWithIds.length === 0) {
        await chrome.tabs.create({ url: "chrome://history" });
        return;
      }

      await chrome.tabs.update(tabsWithIds[0].id!, { active: true });
    })
    .catch(console.error);
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
    for (const tab of tabs) {
      if (tab.id !== undefined && !tab.url?.startsWith("chrome://")) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content-script.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              logger.warn(
                "error executing content script on %s: %s",
                tab.url,
                chrome.runtime.lastError,
              );
            }
          },
        );
      }
    }
  });
});
