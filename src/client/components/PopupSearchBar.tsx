import styles from "../styles/PopupSearchBar.module.css";
import SearchField from "./SearchField";

export default function PopupSearchBar() {
  return (
    <div className={styles.searchBar}>
      <SearchField className={styles.searchField} />
    </div>
  );
}
