import { useMemo } from "react";
import { useTheme } from "../lib/theme";
import themes from '../styles/themes.module.css';
import styles from "../styles/PopupLayout.module.css";

export interface PopupLayoutProps {
  children?: React.ReactNode;
}

export default function PopupLayout({ children }: PopupLayoutProps) {
  const theme = useTheme();

  const layoutClassNames = useMemo(() => {
    const result = themes[theme];
    return [
      styles.layout,
      result ?? themes.dark,
    ];
  }, [theme]);

  return (
    <div className={layoutClassNames.join(' ')}>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
