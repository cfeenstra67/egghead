import SearchField from "./SearchField";
import styles from "../styles/PopupSearchBar.module.css";

export default function PopupSearchBar() {
  return (
    <div className={styles.searchBar}>
      <SearchField className={styles.searchField} />
    </div>
  );
}
