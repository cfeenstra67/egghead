import * as ReactDOM from "react-dom/client";
import App from "./App.js";
import InitialLoad from "./components/InitialLoad.js";
import { WebRuntime } from "./lib/runtimes.js";
import { serverFactory } from "./lib/server-client.js";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <InitialLoad
    dbUrl="dev.db"
    getApp={(db) => (
      <App serverClientFactory={serverFactory(db)} runtime={new WebRuntime()} />
    )}
  />,
);
