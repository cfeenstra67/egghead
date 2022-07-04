import throttle from 'lodash/throttle';
import { ServerClient, processExtensionRequest } from "./server/client";

const serverClient = new ServerClient(processExtensionRequest);

const interactionInterval = 3000;

const postInteraction = throttle(() => {
  chrome.runtime.sendMessage({ type: 'me' }, async (tabId) => {
    await serverClient.tabInteraction({
      tabId: tabId,
      url: window.location.href,
      title: document.title,
    });
  });
}, interactionInterval);

// Capture any interaction event, then let the throttling sort out what we
// actually ends up sending to the server.
[
  'mousemove',
  'click',
  'touchmove',
  'touchstart',
  'mousedown',
  'keydown',
  'keyup',
  'scroll',
].forEach((eventName) => {
  document.addEventListener(eventName, postInteraction);
});
