import styles from "../styles/SideBar.module.css";

export interface SideBarComponentProps {
  children?: React.ReactNode;
}

export function SideBarComponent({ children }: SideBarComponentProps) {
  return <div className={styles.sideBarComponent}>{children}</div>;
}

export interface SideBarProps {
  children?: React.ReactNode;
}

export default function SideBar({ children }: SideBarProps) {
  return <div className={styles.sideBar}>{children}</div>;
}
