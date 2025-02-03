import * as ReactDOM from "react-dom/client";
import DemoWrapper from "./components/DemoWrapper";
import Popup from "./Popup";
import { WebRuntime } from './lib/runtimes';
import { serverFactory } from "./lib/server-client";

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
  />
);
