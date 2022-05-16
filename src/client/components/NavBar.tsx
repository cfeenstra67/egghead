import { useState, useMemo, useContext } from 'react';
import { Link } from 'wouter';
import { AppContext } from '../lib';
import styles from '../styles/NavBar.module.css';
import SearchIcon from '../icons/search-icon.svg';
import CloseCircleIcon from '../icons/close-circle.svg';

function LeftContent() {
  return (
    <div>
      <Link to="/">
        <h1>History</h1>
      </Link>
    </div>
  );
}

function SearchField() {
  const { query, setQuery } = useContext(AppContext);

  return (
    <div className={styles.searchField}>
      <SearchIcon fill="white" className={styles.searchFieldIcon} />
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
          fill="white"
          className={styles.searchFieldClearIcon}
          onClick={() => setQuery('')}
        />
      ) : <></>}
    </div>
  );
}

export default function NavBar() {
  return (
    <div className={styles.navBar} id="navBar">
      <LeftContent />
      <SearchField />
    </div>
  );
}
