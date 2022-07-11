import { useState } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import { AppRuntime, AppContext, getRouterHook } from "./lib";
import { SettingsContextProvider } from './lib/SettingsContext';
import History from "./pages/History";
import SessionDetail from "./pages/SessionDetail";
import GeneralSettings from "./pages/settings/GeneralSettings";
import DataSettings from "./pages/settings/DataSettings";
import DevSettings from "./pages/settings/DevSettings";
import NotFound from "./pages/NotFound";
import type { ServerInterface } from "../server";

// Global CSS
import 'animate.css';
import 'highlight.js/styles/monokai-sublime.css';
import "./styles/App.css";

export interface AppProps {
  runtime: AppRuntime;
  serverClientFactory: () => Promise<ServerInterface>;
  openTabId?: (tabId: number) => void;
  openHistory: () => void;
  getCurrentUrl: () => Promise<string>;
}

function Routes({ runtime, serverClientFactory, openTabId, openHistory, getCurrentUrl }: AppProps) {
  const [location, setLocation] = useLocation();
  const [query, setQueryValue] = useState("");

  function setQuery(input: string): void {
    setQueryValue(input);
    if (location && location !== "/") {
      setLocation("/");
    }
  }

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
        <Switch>
          <Route path="/">
            <History />
          </Route>
          <Route path="/session/:id">
            {(params) => <SessionDetail sessionId={params.id} />}
          </Route>
          <Route path="/settings">
            <GeneralSettings />
          </Route>
          <Route path="/settings/data">
            <DataSettings />
          </Route>
          <Route path="/settings/dev">
            <DevSettings />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </SettingsContextProvider>
    </AppContext.Provider>
  );
}

export default function App(props: AppProps) {
  return (
    <Router hook={getRouterHook(props.runtime)}>
      <Routes {...props} />
    </Router>
  );
}
