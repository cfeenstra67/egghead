import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { AppRuntime } from "./lib/types";
import { serverFactory } from "./lib/server-client";

import existingDb from "../../history.db";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <App
    runtime={AppRuntime.Web}
    serverClientFactory={serverFactory(existingDb)}
  />
);
