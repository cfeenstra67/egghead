import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Popup from "./Popup";
import { ChromePopupRuntime } from './lib/runtimes';
import { ServerClient, processExtensionRequest } from "../server/client";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <Popup
    serverClientFactory={async () => new ServerClient(processExtensionRequest)}
    runtime={new ChromePopupRuntime()}
  />
);
