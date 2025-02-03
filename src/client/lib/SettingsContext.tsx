import { createContext, useContext, useEffect, useState } from "react";
import type { SettingsItems } from "../../models";
import { Aborted } from "../../server/abort";
import { defaultSettings } from "../../server/utils";
import { AppContext } from "./context";

export interface SettingsContext {
  items: SettingsItems;
  refresh: () => void;
  patch: (items: Partial<SettingsItems>) => Promise<SettingsItems>;
}

const settingsContext = createContext<SettingsContext>({
  items: defaultSettings(),
  refresh: () => {
    throw new Error("Not implemented.");
  },
  patch: (items) => {
    throw new Error("Not implemented.");
  },
});

export function useSettingsContext(): SettingsContext {
  return useContext(settingsContext);
}

export interface SettingsContextProps {
  children?: React.ReactNode;
}

export function SettingsContextProvider({ children }: SettingsContextProps) {
  const appContext = useContext(AppContext);
  const [shouldRefresh, setShouldRefresh] = useState(true);

  const refresh = () => setShouldRefresh(true);

  async function patch(items: Partial<SettingsItems>): Promise<SettingsItems> {
    const client = await appContext.serverClientFactory();
    const { settings } = await client.updateSettings({ settings: items });
    setSettings((prev) => ({ ...prev, items: settings }));
    return settings;
  }

  const [settings, setSettings] = useState<SettingsContext>({
    items: defaultSettings(),
    refresh,
    patch,
  });

  useEffect(() => {
    if (!shouldRefresh) {
      return;
    }
    const abort = new AbortController();

    async function load() {
      const client = await appContext.serverClientFactory();
      try {
        const { settings } = await client.getSettings({ abort: abort.signal });
        setSettings((prev) => ({ ...prev, items: settings }));
      } catch (error: any) {
        if (error instanceof Aborted) {
          return;
        }
        throw error;
      }
    }

    load();
    return () => abort.abort();
  }, [shouldRefresh]);

  return (
    <settingsContext.Provider value={settings}>
      {children}
    </settingsContext.Provider>
  );
}
