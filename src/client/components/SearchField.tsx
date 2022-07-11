import { useContext } from "react";
import { AppContext } from "../lib";
import CloseCircleIcon from "../icons/close-circle.svg";
import SearchIcon from "../icons/search-icon.svg";
import styles from "../styles/SearchField.module.css";

export interface SearchFieldProps {
  className?: string;
}

export default function SearchField({ className }: SearchFieldProps) {
  const { query, setQuery } = useContext(AppContext);

  return (
    <div className={`${styles.searchField} ${className}`}>
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
