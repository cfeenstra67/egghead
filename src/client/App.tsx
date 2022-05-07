import Home from './pages/Home';
import NotFound from './pages/NotFound';
import {
  Router,
  Route,
  Switch
} from 'wouter';
import { useHistoryLocation } from './lib/router';

export default function App() {
  return (
    <Router hook={useHistoryLocation}>
      <Switch>
        <Route path="/"><Home/></Route>
        <Route><NotFound/></Route>
      </Switch>
    </Router>
  );
}
