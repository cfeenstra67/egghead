import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Router } from "wouter";
import type { ServerInterface } from "../server";
import PopupComponent from "./components/Popup.js";
import { AppContext } from "./lib";
import { SettingsContextProvider } from "./lib/SettingsContext.js";
import type { RuntimeInterface } from "./lib/runtimes.js";

// Global CSS
import "animate.css";
import "./styles/styles.css";
import { ThemeContextProvider } from "./lib/theme.js";

export interface PopupProps {
  serverClientFactory: () => Promise<ServerInterface>;
  runtime: RuntimeInterface;
}

const queryClient = new QueryClient();

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
          <ThemeContextProvider>
            <QueryClientProvider client={queryClient}>
              <PopupComponent />
            </QueryClientProvider>
          </ThemeContextProvider>
        </SettingsContextProvider>
      </AppContext.Provider>
    </Router>
  );
}
