import { useMemo } from "react";
import { useTheme } from "../lib/theme";
import styles from "../styles/Layout.module.css";
import themes from "../styles/themes.module.css";
import NavBar from "./NavBar";

export interface LayoutProps {
  full?: boolean;
  children: React.ReactNode | React.ReactNode[];
}

export function useLayoutClassNames(): string[] {
  const theme = useTheme();

  return useMemo(() => {
    const result = themes[theme];
    return [styles.layout, result ?? themes.dark];
  }, [theme]);
}

export default function Layout({ children, full }: LayoutProps) {
  const layoutClassNames = useLayoutClassNames();

  const contentClassNames = [
    styles.content,
    full ? styles.contentFull : styles.contentWithSidebar,
  ];

  return (
    <div className={layoutClassNames.join(" ")}>
      <NavBar />
      <div className={contentClassNames.join(" ")}>{children}</div>
    </div>
  );
}
