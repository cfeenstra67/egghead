import * as React from 'react';
import styles from './Layout.css';

export interface LayoutProps {
  children: React.ReactNode | React.ReactNode[];
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      {children}
    </div>
  );
}
