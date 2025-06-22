import parentLogger from "./logger.js";
import { createWorkerClient } from "./server/worker-client.js";

const worker = new Worker("offscreen-worker.js");

const logger = parentLogger.child({ context: "offscreen" });

const workerClient = createWorkerClient(worker);

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.target !== "offscreen") {
    return false;
  }

  workerClient(request)
    .then((response) => {
      sendResponse(response.response);
    })
    .catch((error) => {
      logger.error(error, `Error handling request ${request.requestId}`);
    });
  return true;
});
