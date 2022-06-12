import {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
import { AppContext } from './context';
import { defaultSettings, SettingsItems } from '../../models';

export interface SettingsContext {
  items: SettingsItems;
  refresh: () => void;
  patch: (items: Partial<SettingsItems>) => Promise<SettingsItems>;
}

const settingsContext = createContext<SettingsContext>({
  items: defaultSettings(),
  refresh: () => { throw new Error('Not implemented.') },
  patch: (items) => { throw new Error('Not implemented.') },
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
    let active = true;

    async function load() {
      const client = await appContext.serverClientFactory();
      const { settings } = await client.getSettings({});
      if (active) {
        setShouldRefresh(false);
        setSettings((prev) => ({ ...prev, items: settings }));
      }
    }

    load();
    return () => { active = false; };
  }, [shouldRefresh]);

  return (
    <settingsContext.Provider value={settings}>
      {children}
    </settingsContext.Provider>
  );
}
