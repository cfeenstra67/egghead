import { useState } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import { AppRuntime, AppContext, getRouterHook } from "./lib";
import History from "./pages/History";
import SessionDetail from "./pages/SessionDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import type { ServerInterface } from "../server";

// Global CSS
import 'animate.css';
import "./styles/App.css";

export interface AppProps {
  runtime: AppRuntime;
  serverClientFactory: () => Promise<ServerInterface>;
}

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
    runtime,
    serverClientFactory,
    query,
    setQuery,
  };

  return (
    <AppContext.Provider value={ctx}>
      <Switch>
        <Route path="/">
          <History />
        </Route>
        <Route path="/session/:id">
          {(params) => <SessionDetail sessionId={params.id} />}
        </Route>
        <Route path="/settings">
          <Settings />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
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
