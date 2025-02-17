import throttle from "lodash/throttle";
import {
  createExtensionRequestProcessor,
  createServerClient,
} from "./server/client";

function startContentScript() {
  const serverClient = createServerClient(
    createExtensionRequestProcessor("background"),
  );

  const interactionInterval = 3000;

  const postInteraction = throttle(() => {
    try {
      chrome.runtime?.sendMessage({ type: "me" }, async (tabId) => {
        await serverClient.tabInteraction({
          tabId: tabId,
          url: window.location.href,
          title: document.title,
        });
      });
    } catch (error: any) {
      if (error.toString().includes("Extension context invalidated.")) {
        close();
        return;
      }
      throw error;
    }
  }, interactionInterval);

  const events = [
    "mousemove",
    "click",
    "touchmove",
    "touchstart",
    "mousedown",
    "keydown",
    "keyup",
    "scroll",
  ];

  // Capture any interaction event, then let the throttling sort out what we
  // actually ends up sending to the server.
  events.forEach((eventName) => {
    document.addEventListener(eventName, postInteraction);
  });

  const close = () => {
    events.forEach((eventName) => {
      document.removeEventListener(eventName, postInteraction);
    });
  };
}

startContentScript();
