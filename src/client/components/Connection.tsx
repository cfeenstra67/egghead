import styles from '../styles/Connection.module.css';

export default function Connection() {
  return (
    <div>
      <svg className={styles.connection} viewBox="0 0 20 60">
        <line
          stroke-width="2px"
          stroke="white"
          x1="0"
          y1="30"
          x2="20"
          y2="30"
        />
      </svg>
    </div>
  );
}
