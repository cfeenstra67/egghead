import { createContext } from 'react';
import { ServerInterface } from '../../server';
import { getServerClientFactory } from './server-client';
import { AppRuntime } from './types';

export interface AppContext {
  runtime: AppRuntime;
  serverClientFactory: () => Promise<ServerInterface>;
  query: string;
  setQuery: (input: string) => void;
}

export const AppContext = createContext<AppContext>({
  runtime: AppRuntime.Web,
  serverClientFactory: getServerClientFactory(AppRuntime.Web),
  query: '',
  setQuery: () => {}
});
