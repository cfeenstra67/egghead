import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Route, Router, Switch, useLocation } from "wouter";
import type { ServerInterface } from "../server";
import { AppContext } from "./lib";
import { SettingsContextProvider } from "./lib/SettingsContext";
import type { RuntimeInterface } from "./lib/runtimes";
import { ThemeContextProvider } from "./lib/theme";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import SessionDetail from "./pages/SessionDetail";
import About from "./pages/settings/About";
import DevSettings from "./pages/settings/DevSettings";
import GeneralSettings from "./pages/settings/GeneralSettings";
import ImportExport from "./pages/settings/ImportExport";

// Global CSS
import "animate.css";
import "highlight.js/styles/monokai-sublime.css";
import "./styles/styles.css";

export interface AppProps {
  serverClientFactory: () => Promise<ServerInterface>;
  runtime: RuntimeInterface;
}

const queryClient = new QueryClient();

function Routes({ runtime, serverClientFactory }: AppProps) {
  const [location, setLocation] = useLocation();
  const [query, setQueryValue] = useState("");

  function setQuery(input: string): void {
    setQueryValue(input);
    if (location && location !== "/") {
      setLocation("/");
    }
  }

  const ctx: AppContext = {
    serverClientFactory,
    query,
    setQuery,
    runtime,
  };

  return (
    <AppContext.Provider value={ctx}>
      <SettingsContextProvider>
        <ThemeContextProvider>
          <QueryClientProvider client={queryClient}>
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
              <Route path="/settings/import-export">
                <ImportExport />
              </Route>
              <Route path="/settings/dev">
                <DevSettings />
              </Route>
              <Route path="/about">
                <About />
              </Route>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </QueryClientProvider>
        </ThemeContextProvider>
      </SettingsContextProvider>
    </AppContext.Provider>
  );
}

export default function App(props: AppProps) {
  return (
    <Router hook={props.runtime.routerHook}>
      <Routes {...props} />
    </Router>
  );
}
