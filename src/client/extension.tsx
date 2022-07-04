import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { AppRuntime } from "./lib/types";
import { ServerClient, processExtensionRequest } from "../server/client";

function openTabId(tabId: number): void {
  chrome.runtime.sendMessage({ type: 'openTabId', tabId });
}

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <App
    runtime={AppRuntime.Extension}
    serverClientFactory={async () => new ServerClient(processExtensionRequest)}
    openTabId={openTabId}
  />
);
