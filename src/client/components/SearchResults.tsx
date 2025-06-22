import type { SessionResponse } from "../../server";
import { dateFromSqliteString } from "../../server/utils.js";
import SearchResultsDay from "./SearchResultsDay.js";

function groupSessionsByDay(
  sessions: SessionResponse[],
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
  animate?: boolean;
  sessions: SessionResponse[];
  isLoading?: boolean;
  onEndReached?: () => void;
  query?: string;
  showChecks?: boolean;
  checked?: (id: string) => boolean;
  setChecked?: (ids: string[], checked: boolean) => void;
  showChildren?: "short" | "full";
  showControls?: boolean;
  aggregate?: boolean;
}

export default function SearchResults({
  sessions,
  isLoading,
  onEndReached,
  query,
  showChecks,
  checked,
  setChecked,
  showChildren,
  showControls,
  aggregate,
  animate,
}: SearchResultsProps) {
  const groupedSessions = groupSessionsByDay(sessions);

  return (
    <>
      {groupedSessions.map(([date, daySessions], idx) => (
        <SearchResultsDay
          animate={animate}
          key={date.toString()}
          sessions={daySessions}
          date={date}
          onEndReached={onEndReached}
          isLast={idx === groupedSessions.length - 1}
          showChecks={showChecks}
          checked={checked}
          setChecked={setChecked}
          showChildren={showChildren}
          showControls={showControls}
          aggregate={aggregate}
        />
      ))}
      {groupedSessions.length === 0 && (
        <div className="p-4 font-semibold text-center">
          {isLoading ? (
            <h1>Loading...</h1>
          ) : query !== undefined && query.trim().length < 3 ? (
            <h1>
              No Results. Try lengthening your search to at least 3 characters.
            </h1>
          ) : (
            <h1>No Results.</h1>
          )}
        </div>
      )}
    </>
  );
}
