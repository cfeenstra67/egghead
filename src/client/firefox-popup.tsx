import * as React from "react";
import * as ReactDOM from "react-dom/client";
import InitialCrawl from "./components/InitialCrawl";
import Popup from "./Popup";
import { PopupRuntime } from './lib/runtimes';
import { ServerClient, createExtensionRequestProcessor } from "../server/client";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
const serverClientFactory = async () => new ServerClient(createExtensionRequestProcessor('background'));
root.render(
  <InitialCrawl
    isPopup
    serverClientFactory={serverClientFactory}
    getApp={() => (
      <Popup
        serverClientFactory={serverClientFactory}
        runtime={new PopupRuntime(chrome.runtime.getURL('history.html') + '#')}
      />
    )}
  />
);
