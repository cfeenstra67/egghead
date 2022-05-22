import { Link, useRoute } from 'wouter';
import HistoryIcon from '../icons/history.svg';
import SettingsIcon from '../icons/settings.svg';
import styles from '../styles/SideBar.module.css';

// interface SideBarItemProps {
//   path: string;
//   title: string;
//   icon: React.ReactElement;
// }

// function SideBarItem({ path, title, icon }: SideBarItemProps) {
//   const [isActive, params] = useRoute(path);

//   const classNames = [styles.sideBarItem];
//   if (isActive) {
//     classNames.push(styles.activeSideBarItem);
//   }
//   return (
//     <li className={classNames.join(' ')}>
//       <Link to={path}>
//         {icon}
//         <span>{title}</span>
//       </Link>
//     </li>
//   );
// }

export interface SideBarComponentProps {
  children?: React.ReactNode;
}

export function SideBarComponent({ children }: SideBarComponentProps) {
  return (
    <div className={styles.sideBarComponent}>
      {children}
    </div>
  );
}

export interface SideBarProps {
  children?: React.ReactNode;
}

export default function SideBar({ children }: SideBarProps) {
  return (
    <div className={styles.sideBar}>
      {children}
    </div>
  );
}
