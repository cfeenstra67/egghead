import { createContext } from "react";
import type { ServerInterface } from "../../server";
import { type RuntimeInterface, WebRuntime } from "./runtimes.js";

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
