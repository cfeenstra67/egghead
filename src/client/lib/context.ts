import { createContext } from 'react';
import { ServerInterface } from '../../server';
import { AppRuntime } from './types';

export interface AppContext {
  runtime: AppRuntime;
  serverClientFactory: () => Promise<ServerInterface>;
  query: string;
  setQuery: (input: string) => void;
}

export const AppContext = createContext<AppContext>({
  runtime: AppRuntime.Web,
  serverClientFactory: async () => { throw new Error('Not Implemented.'); },
  query: '',
  setQuery: () => {}
});
