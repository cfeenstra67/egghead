import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { findTabId } from "./lib";
import { ChromeEmbeddedRuntime } from './lib/runtimes';
import { ServerClient, processExtensionRequest } from "../server/client";

const body = document.getElementById("body") as Element;
findTabId().then((tabId) => {
  const root = ReactDOM.createRoot(body);
  root.render(
    <App
      serverClientFactory={async () => new ServerClient(processExtensionRequest)}
      runtime={new ChromeEmbeddedRuntime(tabId)}
    />
  );
});
