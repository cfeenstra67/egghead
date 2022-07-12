import { Link } from 'wouter';
import { useSettingsContext } from '../lib/SettingsContext';
import SideBar from './SideBar';
import styles from '../styles/SettingsSideBar.module.css';

export enum SettingsPage {
  General = 'General',
  ClearBrowsingData = 'ClearBrowsingData',
  Data = 'Data',
  Dev = 'Dev',
}

interface SettingsSideBarItemProps {
  url: string;
  title: string;
  selected?: boolean;
}

function SettingsSideBarItem({ url, title, selected }: SettingsSideBarItemProps) {
  return (
    <Link href={url}>
      <div className={`${styles.item} ${selected ? styles.activeItem : ''}`}>
        {title}
      </div>
    </Link> 
  );
}

export interface SettingsSideBarProps {
  page: SettingsPage;
}

export default function SettingsSideBar({ page }: SettingsSideBarProps) {
  const settings = useSettingsContext();

  return (
    <SideBar>
      <SettingsSideBarItem
        url="/settings"
        title="General"
        selected={page === SettingsPage.General}
      />
      <SettingsSideBarItem
        url="/settings/clear-browsing-data"
        title="Clear Browsing Data"
        selected={page === SettingsPage.ClearBrowsingData}
      />
      <SettingsSideBarItem 
        url="/settings/data"
        title="Data"
        selected={page === SettingsPage.Data}
      />
      {settings.items.devModeEnabled && (
        <SettingsSideBarItem
          url="/settings/dev"
          title="Dev"
          selected={page === SettingsPage.Dev}
        />
      )}
    </SideBar>
  );
}
