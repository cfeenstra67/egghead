import * as React from "react";
import * as ReactDOM from "react-dom/client";
import InitialCrawl from "./components/InitialCrawl";
import Popup from "./Popup";
import { ChromePopupRuntime } from './lib/runtimes';
import { ServerClient, processExtensionRequest } from "../server/client";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
const serverClientFactory = async () => new ServerClient(processExtensionRequest);
root.render(
  <InitialCrawl
    isPopup
    serverClientFactory={serverClientFactory}
    getApp={() => (
      <Popup
        serverClientFactory={serverClientFactory}
        runtime={new ChromePopupRuntime()}
      />
    )}
  />
);
