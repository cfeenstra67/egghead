import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { webOpenHistory, webGetCurrentUrl } from "./lib/adapters";
import { serverFactory } from "./lib/server-client";
import { AppRuntime } from "./lib/types";

fetch("history.db").then(async (response) => {
  console.log('Fetched', response.status);
  const existingDb = new Uint8Array(await response.arrayBuffer());

  const body = document.getElementById("body") as Element;
  const root = ReactDOM.createRoot(body);
  root.render(
    <App
      runtime={AppRuntime.Web}
      serverClientFactory={serverFactory(existingDb)}
      openHistory={webOpenHistory}
      getCurrentUrl={webGetCurrentUrl}
    />
  );
});
