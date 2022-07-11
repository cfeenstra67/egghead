import { useContext } from "react";
import { Link } from "wouter";
import { AppContext } from "../lib";
import styles from "../styles/NavBar.module.css";
import EggheadIcon from '../icons/egghead.svg';
import SettingsIcon from "../icons/settings.svg";
import SearchField from "./SearchField";

function LeftContent() {
  return (
    <div className={styles.leftContent}>
      <Link to="/">
        <EggheadIcon className={styles.eggheadIcon} />
      </Link>
    </div>
  );
}

function RightContent() {
  return (
    <div className={styles.rightContent}>
      <Link to="/settings">
        <SettingsIcon className={styles.settingsIcon} />
      </Link>
    </div>
  );
}

export default function NavBar() {
  return (
    <div className={styles.navBar} id="navBar">
      <LeftContent />
      <SearchField />
      <RightContent />
    </div>
  );
}
