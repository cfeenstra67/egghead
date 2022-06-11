import { ServerResponseCode } from "./server";
import { createBackgroundServerRequestProcessor } from "./server/background-client";
import { ServerClient } from "./server/client";
import { setupObservers } from "./extension/utils";

const serverConnection = createBackgroundServerRequestProcessor();
const serverClient = new ServerClient(serverConnection);

setupObservers(serverClient);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  serverConnection(request)
    .then(sendResponse)
    .catch((error) => {
      console.trace("Error handling extension request.", error);
      sendResponse({
        code: ServerResponseCode.Error,
        message: error.toString(),
      });
    });
  return true;
});
