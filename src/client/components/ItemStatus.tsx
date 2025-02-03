import styles from "../styles/ItemStatus.module.css";

export interface ItemStatusProps {
  active?: boolean;
}

export default function ItemStatus({ active }: ItemStatusProps) {
  return (
    <svg
      className={styles.itemStatus}
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="5" fillOpacity={active ? "0.8" : "0"} />
    </svg>
  );
}
