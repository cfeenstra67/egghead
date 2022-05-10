import { useMemo, useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Link } from 'wouter';
import InfoIcon from '../icons/info.svg';
import { getFaviconUrl } from '../lib/favicon';
import { SessionResponse } from '../../server'; 
import styles from '../styles/SearchResults.module.css';

function getTimeString(date: Date): string {
  const [time, amPm] = date.toLocaleTimeString().split(' ');
  const timeString = time.split(':').slice(0, 2).join(':');
  return `${timeString} ${amPm}`;
}

interface SearchResultItemProps {
  session: SessionResponse;
  isLast?: boolean;
  onEndReached?: () => void;
}

function SearchResultItem(
  { session, isLast, onEndReached }: SearchResultItemProps
) {
  const url = new URL(session.url);
  const [isInView, setIsInView] = useState<boolean>(false);
  const { ref, inView, entry } = useInView({
    threshold: [0],
    trackVisibility: true,
    delay: 100,
  });

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
    <div className={styles.searchResultsItem} ref={ref}>
      <div
        className={styles.searchResultsItemTime}
        data-top-tooltip={session.startedAt.toLocaleString()}
      >
        {getTimeString(session.startedAt)}
      </div>
      <img src={getFaviconUrl(url.hostname, 16)} />
      <div
        className={styles.searchResultsItemContent}
        data-top-tooltip={session.title}
      >
        <div className={styles.searchResultsItemContentInner}>
          <div className={styles.searchResultsItemTitle}>
            <a href={session.rawUrl} target="_blank">
              {session.title}
            </a>
          </div>
          <div className={styles.searchResultsItemHost}>
            {url.hostname}
          </div>
        </div>
        {session.childCount > 0 && (
          <div className={styles.searchResultsItemCaption}>
            Opened {session.childCount} link(s)
          </div>
        )}
      </div>
      <div data-left-tooltip="View session details.">
        <Link to={`/session/${session.id}`}>
          <InfoIcon
            fill="white"
            className={styles.searchResultsItemDetail}
          />
        </Link>
      </div>
    </div>
  );
};

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
  return (
    <div className={styles.searchResults}>
      {sessions.map((session, idx) => (
        <SearchResultItem
          session={session}
          key={session.id}
          isLast={idx === sessions.length - 1}
          onEndReached={onEndReached}
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
