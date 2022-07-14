import * as React from "react";
import * as ReactDOM from "react-dom/client";
import InitialLoad from "./components/InitialLoad";
import Popup from "./Popup";
import { WebRuntime } from './lib/runtimes';
import { serverFactory } from "./lib/server-client";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <InitialLoad
    isPopup
    dbUrl="demo.db"
    getApp={(db) => (
      <Popup
        serverClientFactory={serverFactory(db)}
        runtime={new WebRuntime()}
      />
    )}
  />
);
