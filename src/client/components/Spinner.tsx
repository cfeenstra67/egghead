import styles from '../styles/Spinner.module.css';

export default function Spinner() {
  return (
    <div className={styles.spinnerParent}>
      <div className={styles.spinner}><div/></div>
    </div>
  );
}
