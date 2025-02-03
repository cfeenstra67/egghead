import * as ReactDOM from "react-dom/client";
import Popup from "./Popup";
import InitialLoad from "./components/InitialLoad";
import { WebRuntime } from "./lib/runtimes";
import { serverFactory } from "./lib/server-client";

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
