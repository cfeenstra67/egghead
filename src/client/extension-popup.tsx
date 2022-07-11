import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Popup from "./Popup";
import { chromeOpenHistory, chromeGetCurrentUrl } from "./lib/adapters";
import { ServerClient, processExtensionRequest } from "../server/client";
import { AppRuntime } from "./lib/types";

function openTabId(tabId: number): void {
  chrome.runtime.sendMessage({ type: 'openTabId', tabId });
}

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <Popup
    runtime={AppRuntime.Extension}
    serverClientFactory={async () => new ServerClient(processExtensionRequest)}
    openTabId={openTabId}
    openHistory={chromeOpenHistory}
    getCurrentUrl={chromeGetCurrentUrl}
  />
);
