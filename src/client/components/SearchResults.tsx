import Card from "./Card";
import SearchResultsDay from "./SearchResultsDay";
import type { SessionResponse } from "../../server";
import { dateFromSqliteString } from "../../server/utils";
import styles from "../styles/SearchResults.module.css";

function groupSessionsByDay(
  sessions: SessionResponse[]
): [Date, SessionResponse[]][] {
  const out: [Date, SessionResponse[]][] = [];

  sessions.forEach((session) => {
    const date = dateFromSqliteString(session.startedAt);
    date.setHours(0, 0, 0, 0);
    if (
      out.length === 0 ||
      date.getTime() !== out[out.length - 1][0].getTime()
    ) {
      out.push([date, []]);
    }
    out[out.length - 1][1].push(session);
  });

  return out;
}

export interface SearchResultsProps {
  sessions: SessionResponse[];
  isLoading?: boolean;
  onEndReached?: () => void;
  query?: string;
}

export default function SearchResults({
  sessions,
  isLoading,
  onEndReached,
  query,
}: SearchResultsProps) {
  const groupedSessions = groupSessionsByDay(sessions);

  return (
    <div className={styles.searchResults}>
      {groupedSessions.map(([date, daySessions], idx) => (
        <SearchResultsDay
          key={date.toString()}
          sessions={daySessions}
          date={date}
          onEndReached={onEndReached}
          isLast={idx === groupedSessions.length - 1}
        />
      ))}
      {sessions.length === 0 &&
        (isLoading ? (
          <Card>Loading...</Card> 
        ) : query !== undefined && query.trim().length < 3 ? (
          <Card>
            No Results. Try lengthening your search to at least 3 characters.
          </Card>
        ) : (
          <Card>No Results.</Card>
        ))}
    </div>
  );
}
