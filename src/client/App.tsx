import { useState } from 'react';
import {
  Router,
  Route,
  Switch,
  useLocation,
} from 'wouter';
import {
  AppRuntime,
  AppContext,
  getServerClientFactory,
  getRouterHook,
} from './lib';
import History from './pages/History';
import SessionDetail from './pages/SessionDetail';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Global CSS
import './styles/App.css';

export interface AppProps {
  runtime: AppRuntime;
}

function Routes({ runtime }: AppProps) {
  const [location, setLocation] = useLocation();
  const [query, setQueryValue] = useState('');

  function setQuery(input: string): void {
    setQueryValue(input);
    setLocation('/');
  }

  const ctx: AppContext = {
    runtime,
    serverClientFactory: getServerClientFactory(runtime),
    query,
    setQuery,
  }

  return (
    <AppContext.Provider value={ctx}>
      <Switch>
        <Route path="/"><History/></Route>
        <Route path="/session/:id">
          {(params) => <SessionDetail sessionId={params.id} />}
        </Route>
        <Route path="/settings"><Settings/></Route>
        <Route><NotFound/></Route>
      </Switch>
    </AppContext.Provider>
  );
}

export default function App({ runtime }: AppProps) {
  return (
    <Router hook={getRouterHook(runtime)}>
      <Routes runtime={runtime} />
    </Router>
  );
}
