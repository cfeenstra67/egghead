import { useState } from "react";
import { Router } from "wouter";
import type { ServerInterface } from "../server";
import PopupComponent from "./components/Popup";
import { AppContext } from "./lib";
import { SettingsContextProvider } from "./lib/SettingsContext";
import type { RuntimeInterface } from "./lib/runtimes";

// Global CSS
import "animate.css";
import "./styles/Popup.css";

export interface PopupProps {
  serverClientFactory: () => Promise<ServerInterface>;
  runtime: RuntimeInterface;
}

export default function Popup({ runtime, serverClientFactory }: PopupProps) {
  const [query, setQuery] = useState("");

  const ctx: AppContext = {
    runtime,
    serverClientFactory,
    query,
    setQuery,
  };

  return (
    <Router hook={runtime.routerHook}>
      <AppContext.Provider value={ctx}>
        <SettingsContextProvider>
          <PopupComponent />
        </SettingsContextProvider>
      </AppContext.Provider>
    </Router>
  );
}
