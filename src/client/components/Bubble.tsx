import styles from "../styles/Bubble.module.css";

interface BubbleProps {
  children?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export default function Bubble({ children, onClick, selected }: BubbleProps) {
  return (
    <div
      className={`${styles.bubble} ${selected ? styles.selectedBubble : ""}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
