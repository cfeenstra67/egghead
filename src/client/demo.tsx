import * as ReactDOM from "react-dom/client";
import App from "./App";
import DemoWrapper from "./components/DemoWrapper";
import { WebRuntime } from './lib/runtimes';
import { serverFactory } from "./lib/server-client";

const body = document.getElementById("body") as Element;
const root = ReactDOM.createRoot(body);
root.render(
  <DemoWrapper
    getApp={(db) => (
      <App
        serverClientFactory={serverFactory(db)}
        runtime={new WebRuntime()}
      />
    )}
  />
);
