import { createContext } from "react";
import type { ServerInterface } from "../../server";
import { AppRuntime } from "./types";

export interface AppContext {
  runtime: AppRuntime;
  serverClientFactory: () => Promise<ServerInterface>;
  query: string;
  setQuery: (input: string) => void;
  openTabId?: (tabId: number) => void;
  openHistory: () => void;
  getCurrentUrl: () => Promise<string>;
}

export const AppContext = createContext<AppContext>({
  runtime: AppRuntime.Web,
  serverClientFactory: async () => {
    throw new Error("Not Implemented.");
  },
  query: "",
  setQuery: () => {},
  openHistory: () => {},
  getCurrentUrl: async () => 'NOT_IMPLEMENTED',
});
