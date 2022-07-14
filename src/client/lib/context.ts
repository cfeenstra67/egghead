import { createContext } from "react";
import { RuntimeInterface, WebRuntime } from './runtimes';
import type { ServerInterface } from "../../server";

export interface AppContext {
  serverClientFactory: () => Promise<ServerInterface>;
  query: string;
  setQuery: (input: string) => void;
  runtime: RuntimeInterface;
}

export const AppContext = createContext<AppContext>({
  serverClientFactory: async () => {
    throw new Error("Not Implemented.");
  },
  query: "",
  setQuery: () => {},
  runtime: new WebRuntime(),
});
