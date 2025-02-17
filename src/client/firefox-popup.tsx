import * as ReactDOM from "react-dom/client";
import {
  createExtensionRequestProcessor,
  createServerClient,
} from "../server/client";
import Popup from "./Popup";
import InitialCrawl from "./components/InitialCrawl";
import { PopupRuntime } from "./lib/runtimes";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
const serverClientFactory = async () =>
  createServerClient(createExtensionRequestProcessor("background"));
root.render(
  <InitialCrawl
    isPopup
    serverClientFactory={serverClientFactory}
    getApp={() => (
      <Popup
        serverClientFactory={serverClientFactory}
        runtime={new PopupRuntime(`${chrome.runtime.getURL("history.html")}#`)}
      />
    )}
  />,
);
