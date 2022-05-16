import { useMemo, useState, useEffect, useContext, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { Link } from 'wouter';
import DropdownIcon from '../icons/dropdown.svg';
import InfoIcon from '../icons/info.svg';
import { getFaviconUrlPublicApi } from '../lib/favicon';
import { AppContext } from '../lib/context';
import { Session } from '../../models';
import { SessionResponse } from '../../server'; 
import { dslToClause } from '../../server/clause'; 
import styles from '../styles/SearchResults.module.css';

function getTimeString(date: string): string {
  const [time, amPm] = new Date(date).toLocaleTimeString().split(' ');
  const timeString = time.split(':').slice(0, 2).join(':');
  return `${timeString} ${amPm}`;
}

interface SearchResultItemProps {
  session: SessionResponse;
  isLast?: boolean;
  onEndReached?: () => void;
  indent?: number;
}

function SearchResultItem(
  { session, isLast, onEndReached, indent }: SearchResultItemProps
) {
  const url = new URL(session.url);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const { ref, inView, entry } = useInView({
    threshold: [0],
    trackVisibility: true,
    delay: 100,
    rootMargin: '400px 0px 0px 0px',
  });

  const [children, setChildren] = useState<SessionResponse[]>([]);

  const { runtime, serverClientFactory } = useContext(AppContext);

  const toggleExpanded = useCallback(() => {
    if (expanded) {
      setChildren([]);
      setExpanded(false);
    } else {
      setExpanded(true);
      serverClientFactory().then(async (client) => {
        const children = await client.querySessions({
          filter: dslToClause<Session>({
            parentSessionId: session.id
          })
        });
        setChildren(children.results);
      });
    }
  }, [expanded]);

  const dropDownClassNames = [styles.searchResultsItemCaption];
  if (expanded) {
    dropDownClassNames.push(styles.childrenExpanded);
  }

  useEffect(() => {
    if (!isLast) {
      return;
    }
    if (inView !== isInView) {
      setIsInView(inView);
      if (inView && onEndReached) {
        onEndReached();
      }
    }
  }, [inView]);

  return (
    <>
      <div
        className={(indent || 0) > 0 ? (
          styles.searchResultsItemChild
        ) : (
          styles.searchResultsItem
        )}
        ref={ref}
        style={{ marginLeft: (24 * (indent || 0)) + 'px' }}
      >
        <Link to={`/session/${session.id}`}>
          <InfoIcon
            fill="white"
            className={styles.searchResultsItemDetail}
          />
        </Link>
        <div className={styles.searchResultsItemTime}>
          <span title={new Date(session.startedAt).toLocaleString()}>
            {getTimeString(session.startedAt)}
          </span>
        </div>
        <img src={getFaviconUrlPublicApi(url.hostname, 16)} />
        <div className={styles.searchResultsItemContent}>
          <div className={styles.searchResultsItemContentInner}>
            <div className={styles.searchResultsItemTitle}>
              <a href={session.rawUrl} target="_blank">
                <span title={session.title}>{session.title}</span>
              </a>
            </div>
            <div className={styles.searchResultsItemHost}>
              <span title={session.url}>
                {url.hostname}
              </span>
            </div>
          </div>
          {session.childCount > 0 && (
            <div className={dropDownClassNames.join(' ')}>
              <DropdownIcon fill="white" onClick={toggleExpanded}/>
              <span>
                Opened {session.childCount} link{session.childCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
      {children.map((child) => (
        <SearchResultItem session={child} indent={(indent || 0) + 1} />
      ))}
    </>
  );
};

interface SearchResultsDayProps {
  date: Date;
  sessions: SessionResponse[];
  onEndReached?: () => void;
  isLast: boolean;
}

function SearchResultsDay({
  date,
  sessions,
  isLast,
  onEndReached
}: SearchResultsDayProps) {
  const { ref, inView, entry } = useInView({
    threshold: [0],
    trackVisibility: true,
    delay: 100,
  });

  // const { ref: titleRef, inView: titleInView, entry: titleEntry } = useInView({
  //   threshold: [0],
  //   root: document.querySelector('#navBar'),
  // });

  // const [isSticky, setIsSticky] = useState(false);

  // const sticky = inView && !titleInView;

  return (
    <div className={styles.searchResultsDay} ref={ref}>
      <div>
        <div className={styles.searchResultsDaySticky}>
          {date.toString()}
        </div>
      </div>
      {sessions.map((session, idx) => (
        <SearchResultItem
          session={session}
          key={session.id}
          isLast={isLast && idx === sessions.length - 1}
          onEndReached={onEndReached}
        />
      ))}
    </div>
  );
}

function groupSessionsByDay(sessions: SessionResponse[]): [Date, SessionResponse[]][] {
  const out: [Date, SessionResponse[]][] = [];

  sessions.forEach((session) => {
    const date = new Date(session.startedAt);
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
};

export default function SearchResults({
  sessions,
  isLoading,
  onEndReached,
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
      {sessions.length === 0 && (
        isLoading ? (
          <p>Loading...</p>
        ) : (
          <p>No Results.</p>
        )
      )}
    </div>
  );
}
