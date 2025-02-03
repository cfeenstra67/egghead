import * as ReactDOM from "react-dom/client";
import App from "./App";
import InitialLoad from "./components/InitialLoad";
import { WebRuntime } from "./lib/runtimes";
import { serverFactory } from "./lib/server-client";

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
