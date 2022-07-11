import styles from "../styles/SettingsOptionStatus.module.css";

export enum LoadingState {
  None = "None",
  Loading = "Loading",
  Success = "Success",
  Failed = "Failed",
}

function getOptionStatusClassName(state: LoadingState): string {
  switch (state) {
    case LoadingState.None:
      return "";
    case LoadingState.Loading:
      return styles.optionLoading;
    case LoadingState.Success:
      return styles.optionSuccess;
    case LoadingState.Failed:
      return styles.optionError;
  }
}

export interface SettingsOptionStatusProps {
  state: LoadingState;
}

export default function SettingsOptionStatus({ state }: SettingsOptionStatusProps) {
  const className = getOptionStatusClassName(state);

  return <div className={`${styles.optionStatus} ${className}`} />;
}
