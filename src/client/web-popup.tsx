import * as ReactDOM from "react-dom/client";
import Popup from "./Popup.js";
import InitialLoad from "./components/InitialLoad.js";
import { WebRuntime } from "./lib/runtimes.js";
import { serverFactory } from "./lib/server-client.js";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <InitialLoad
    isPopup
    dbUrl="dev.db"
    getApp={(db) => (
      <Popup
        serverClientFactory={serverFactory(db)}
        runtime={new WebRuntime()}
      />
    )}
  />,
);
