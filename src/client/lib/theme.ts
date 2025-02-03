import { useEffect, useState } from "react";
import { Theme } from "../../server/types";
import { useSettingsContext } from "./SettingsContext";

type NonAutoType<T extends Theme> = T extends Theme.Auto ? never : T;

export type ConcreteTheme = NonAutoType<Theme>;

export function useTheme(): ConcreteTheme {
  const { items } = useSettingsContext();

  const [isDark, setIsDark] = useState(true);
  const windowExists = typeof window !== "undefined";

  useEffect(() => {
    if (!windowExists) {
      return;
    }

    const match = matchMedia("(prefers-color-scheme: dark)");
    setIsDark(match.matches);

    const listener = (event: MediaQueryListEvent) => {
      setIsDark(event.matches);
    };

    match.addEventListener("change", listener);

    return () => match.removeEventListener("change", listener);
  }, [windowExists]);

  if (items.theme !== Theme.Auto) {
    return items.theme;
  }
  return isDark ? Theme.Dark : Theme.Light;
}
