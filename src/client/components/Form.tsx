import styles from '../styles/Form.module.css';

export interface FormProps {
  children?: React.ReactNode;
}

export default function Form({ children }: FormProps) {
  return (
    <div className={styles.form}>
      {children}
    </div>
  );
}
