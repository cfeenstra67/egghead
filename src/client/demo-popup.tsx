import * as ReactDOM from "react-dom/client";
import Popup from "./Popup.js";
import DemoWrapper from "./components/DemoWrapper.js";
import { WebRuntime } from "./lib/runtimes.js";
import { serverFactory } from "./lib/server-client.js";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <DemoWrapper
    isPopup
    getApp={(db) => (
      <Popup
        serverClientFactory={serverFactory(db)}
        runtime={new WebRuntime()}
      />
    )}
  />,
);
