import parentLogger from "../logger";
import { createExtensionRequestProcessor } from "./client";
import type { RequestHandler } from "./types";

const logger = parentLogger.child({ context: "offscreen-client" });

let creating: Promise<void> | null;

async function setupOffscreenDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  if (await chrome.offscreen.hasDocument?.()) return;

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: chrome.runtime.getURL("offscreen.html"),
      reasons: [chrome.offscreen.Reason.WORKERS, chrome.offscreen.Reason.BLOBS],
      justification: "To run web worker to run sqlite",
    });
    await creating;
    creating = null;
  }
}

export function createOffscreenClient(): RequestHandler {
  let failed = false;
  setupOffscreenDocument().catch((error) => {
    logger.error(error, "Unable to set up offscreen document");
    failed = true;
  });

  return async (request) => {
    await setupOffscreenDocument();

    const handler = createExtensionRequestProcessor("offscreen");

    return await handler(request);
  };
}
