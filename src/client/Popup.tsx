import { useState } from "react";
import PopupComponent from "./components/Popup";
import { AppRuntime, AppContext } from "./lib";
import { SettingsContextProvider } from './lib/SettingsContext';
import type { ServerInterface } from "../server";

// Global CSS
import 'animate.css';
import "./styles/Popup.css";

export interface PopupProps {
  runtime: AppRuntime;
  serverClientFactory: () => Promise<ServerInterface>;
  openTabId?: (tabId: number) => void;
  openHistory: () => void;
  getCurrentUrl: () => Promise<string>;
}

export default function Popup({
  runtime,
  serverClientFactory,
  openTabId,
  openHistory,
  getCurrentUrl,
}: PopupProps) {
  const [query, setQuery] = useState("");

  const ctx: AppContext = {
    runtime,
    serverClientFactory,
    query,
    setQuery,
    openTabId,
    openHistory,
    getCurrentUrl,
  };

  return (
    <AppContext.Provider value={ctx}>
      <SettingsContextProvider>
        <PopupComponent />
      </SettingsContextProvider>
    </AppContext.Provider>
  );
}
