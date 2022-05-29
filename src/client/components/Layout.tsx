import * as React from "react";
import styles from "../styles/Layout.module.css";
import NavBar from "./NavBar";
import SideBar from "./SideBar";

export interface LayoutProps {
  children: React.ReactNode | React.ReactNode[];
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={`${styles.layout} ${styles.primaryTheme}`}>
      <NavBar />
      <SideBar />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
