import { TransitionGroup } from "react-transition-group";
import type { SessionResponse } from "../../server";
import SearchResultsItem, {
  getAggSession,
  groupSessions,
} from "./SearchResultsItem";

interface SearchResultsDayProps {
  date: Date;
  sessions: SessionResponse[];
  onEndReached?: () => void;
  isLast: boolean;
  showChecks?: boolean;
  checked?: (id: string) => boolean;
  setChecked?: (ids: string[], checked: boolean) => void;
  animate?: boolean;
  showChildren?: "short" | "full";
  showControls?: boolean;
  aggregate?: boolean;
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
  showChecks,
  setChecked,
  checked,
  animate,
  showChildren,
  showControls,
  aggregate,
}: SearchResultsDayProps) {
  const groupedSessions = aggregate
    ? groupSessions(sessions)
    : sessions.map((s) => getAggSession(s));
  return (
    <>
      <div className="p-2 sticky top-[-1px] bg-background z-10 border-y">
        <h2 className="text-sm font-medium text-muted-foreground">
          {dateString(date)}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        <TransitionGroup component={null}>
          {groupedSessions.flatMap((session, idx) => (
            <SearchResultsItem
              key={session.session.id}
              showChildren={showChecks ? undefined : showChildren}
              showControls={!showChecks && showControls}
              animate={animate}
              aggSession={session}
              isLast={isLast && idx === groupedSessions.length - 1}
              onEndReached={onEndReached}
              showChecks={showChecks}
              checked={checked}
              setChecked={setChecked}
            />
          ))}
        </TransitionGroup>
      </div>
    </>
  );
}
