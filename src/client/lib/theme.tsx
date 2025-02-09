import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Theme } from "../../server/types";
import { useSettingsContext } from "./SettingsContext";

export type ConcreteTheme = Exclude<Theme, Theme.Auto>;

const ThemeContext = createContext<ConcreteTheme>(Theme.Dark);

export const themeClasses: Record<ConcreteTheme, string> = {
  [Theme.Light]: "lightTheme",
  [Theme.Dark]: "darkTheme",
};

export function ThemeContextProvider({ children }: PropsWithChildren) {
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

  let theme: ConcreteTheme;
  if (items.theme !== Theme.Auto) {
    theme = items.theme;
  } else {
    theme = isDark ? Theme.Dark : Theme.Light;
  }

  useEffect(() => {
    if (!windowExists) {
      return;
    }

    const body = document.querySelector("body");
    if (!body) {
      return;
    }

    for (const otherTheme of Object.values(Theme)) {
      if (otherTheme === Theme.Auto) {
        continue;
      }
      if (theme === otherTheme) {
        body.classList.add(themeClasses[otherTheme]);
      } else {
        body.classList.remove(themeClasses[otherTheme]);
      }
    }
  }, [theme, windowExists]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ConcreteTheme {
  return useContext(ThemeContext);
}
