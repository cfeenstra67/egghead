import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import InitialCrawl from "./components/InitialCrawl";
import { findTabId } from "./lib";
import { ChromeEmbeddedRuntime } from './lib/runtimes';
import { ServerClient, processExtensionRequest } from "../server/client";

const body = document.getElementById("body") as Element;
findTabId().then((tabId) => {
  const root = ReactDOM.createRoot(body);
  const serverClientFactory = async () => new ServerClient(processExtensionRequest);
  root.render(
    <InitialCrawl
      serverClientFactory={serverClientFactory}
      getApp={() => (
        <App
          serverClientFactory={serverClientFactory}
          runtime={new ChromeEmbeddedRuntime(tabId)}
        />
      )}
    />
  );
});
