import { useMemo } from "react";
import { useTheme } from "../lib/theme";
import styles from "../styles/Layout.module.css";
import themes from '../styles/themes.module.css';
import NavBar from "./NavBar";
import SideBar from "./SideBar";
import { Theme } from "../../server/types";

export interface LayoutProps {
  children: React.ReactNode | React.ReactNode[];
}

export default function Layout({ children }: LayoutProps) {
  const theme = useTheme();

  const className = useMemo(() => {
    const result = themes[theme];
    return result ?? themes.dark;
  }, [theme]);

  return (
    <div className={`${styles.layout} ${className}`}>
      <NavBar />
      <SideBar />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
