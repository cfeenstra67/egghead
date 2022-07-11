import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Popup from "./Popup";
import { webOpenHistory, webGetCurrentUrl } from "./lib/adapters";
import { serverFactory } from "./lib/server-client";
import { AppRuntime } from "./lib/types";

import existingDb from "../../history.db";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <Popup
    runtime={AppRuntime.Web}
    serverClientFactory={serverFactory(existingDb)}
    openHistory={webOpenHistory}
    getCurrentUrl={webGetCurrentUrl}
  />
);
