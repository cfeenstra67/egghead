import * as ReactDOM from "react-dom/client";
import {
  createExtensionRequestProcessor,
  createServerClient,
} from "../server/client";
import App from "./App";
import InitialCrawl from "./components/InitialCrawl";
import { WebRuntime } from "./lib/runtimes";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
const serverClientFactory = async () =>
  createServerClient(createExtensionRequestProcessor("background"));
root.render(
  <InitialCrawl
    serverClientFactory={serverClientFactory}
    getApp={() => (
      <App
        serverClientFactory={serverClientFactory}
        runtime={new WebRuntime()}
      />
    )}
  />,
);
