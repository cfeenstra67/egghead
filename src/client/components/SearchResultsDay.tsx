import { TransitionGroup } from 'react-transition-group';
import SearchResultsItem, { groupSessions } from "./SearchResultsItem";
import { SessionResponse } from "../../server";
import styles from "../styles/SearchResults.module.css";

interface SearchResultsDayProps {
  date: Date;
  sessions: SessionResponse[];
  onEndReached?: () => void;
  isLast: boolean;
}

function dateString(date: Date): string {
  const formatted = Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);

  function isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  if (isSameDate(date, today)) {
    return `Today - ${formatted}`;
  }
  if (isSameDate(date, yesterday)) {
    return `Yesterday - ${formatted}`;
  }
  return formatted;
}

export default function SearchResultsDay({
  date,
  sessions,
  isLast,
  onEndReached,
}: SearchResultsDayProps) {
  return (
    <div className={styles.searchResultsDay}>
      <div className={styles.searchResultsDaySticky}>
        <h3>{dateString(date)}</h3>
      </div>
      <TransitionGroup component={null}>
        {groupSessions(sessions).flatMap((session, idx) => (
          <SearchResultsItem
            aggSession={session}
            key={session.session.id}
            isLast={isLast && idx === sessions.length - 1}
            onEndReached={onEndReached}
          />
        ))}
      </TransitionGroup>
    </div>
  );
}
