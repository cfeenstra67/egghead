import { useContext } from "react";
import { Link } from "wouter";
import { AppContext } from "../lib";
import styles from "../styles/NavBar.module.css";
import CloseCircleIcon from "../icons/close-circle.svg";
import EggheadIcon from '../icons/egghead.svg';
import SearchIcon from "../icons/search-icon.svg";
import SettingsIcon from "../icons/settings.svg";

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

function SearchField() {
  const { query, setQuery } = useContext(AppContext);

  return (
    <div className={styles.searchField}>
      <SearchIcon className={styles.searchFieldIcon} />
      <input
        type="search"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck="false"
        placeholder="Search History"
        autoFocus
        value={query}
        onChange={(evt) => setQuery(evt.target.value)}
      />
      {query ? (
        <CloseCircleIcon
          className={styles.searchFieldClearIcon}
          onClick={() => setQuery("")}
        />
      ) : (
        <></>
      )}
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
