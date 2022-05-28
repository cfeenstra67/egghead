import { useState, createRef, useEffect, useCallback, useContext } from 'react';
import { useInView } from 'react-intersection-observer';
import { Link } from 'wouter';
import Word from './Word';
import Connection from './Connection';
import Highlighted from './Highlighted';
import DropdownIcon from '../icons/dropdown.svg';
import EllipsisIcon from '../icons/ellipsis.svg';
import { AppContext } from '../lib/context';
import { getFaviconUrlPublicApi } from '../lib/favicon';
import { Session } from '../../models';
import { SessionResponse } from '../../server';
import { dslToClause } from '../../server/clause';
import { dateFromSqliteString } from '../../server/utils';
import styles from '../styles/SearchResults.module.css';

function cleanRawUrl(url: string): string {
  const urlObj = new URL(url);
  urlObj.hash = '';
  return urlObj.href;
}

function getTimeString(date: string): string {
  const [time, amPm] = dateFromSqliteString(date).toLocaleTimeString().split(' ');
  const timeString = time.split(':').slice(0, 2).join(':');
  return `${timeString} ${amPm}`;
}

function DetailsDropdown({ session }: { session: SessionResponse }) {
  const [expanded, setExpanded] = useState(false);
  const ref = createRef<HTMLDivElement>();

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as any)) {
        setExpanded(false);
        cancel();
      }
    }

    const cancel = () => document.removeEventListener('click', handleClickOutside, true);

    document.addEventListener('click', handleClickOutside, true);

    return cancel;
  }, [expanded, setExpanded]);

  return (
    <div>
      <EllipsisIcon
        className={styles.moreDetails}
        fill="white"
        onClick={() => setExpanded(!expanded)}
      />
      {expanded && (
        <div className={styles.expandedDetails} ref={ref}>
          <Link to={`/session/${session.id}`}>
            Details
          </Link>
        </div>
      )}
    </div>
  );
}

enum ChildType {
  Link = 'LINK',
  FormSubmit = 'FORM_SUBMIT',
  Typed = 'TYPED',
  Duplicate = 'DUPLICATE',
}

interface SingleAggregatedSession {
  type: 'single';
  session: SessionResponse;
  duplicateSessions: SessionResponse[];
}

interface SearchResultsItemProps {
  aggSession: SingleAggregatedSession;
  isLast?: boolean;
  onEndReached?: () => void;
  indent?: number;
}

export function groupSessions(sessions: SessionResponse[]): SingleAggregatedSession[] {
  const sessionsById = Object.fromEntries(sessions.map((session) => {
    return [session.id, session];
  }));
  const grouped: Record<string, SessionResponse[]> = {};
  sessions.forEach((session) => {
    let outUrl = cleanRawUrl(session.rawUrl);
    if (
      session.parentSessionId &&
      session.transitionType === 'reload' &&
      sessionsById[session.parentSessionId]
    ) {
      outUrl = cleanRawUrl(sessionsById[session.parentSessionId].rawUrl);
    }
    if (!grouped[outUrl]) {
      grouped[outUrl] = [];
    }
    grouped[outUrl].push(session);
  });
  return Object.entries(grouped).map(([url, sessions]) => {
    return {
      type: 'single',
      session: sessions[0],
      duplicateSessions: sessions.slice(1),
    }
  });
}

function getAggSession(session: SessionResponse): SingleAggregatedSession {
  return {
    type: 'single',
    session,
    duplicateSessions: [],
  };
}

function processChildTransitions(
  childTransitions: Record<string, string>
): Omit<Record<ChildType, number>, ChildType.Duplicate> {
  const out = {
    [ChildType.Link]: 0,
    [ChildType.FormSubmit]: 0,
    [ChildType.Typed]: 0,
  };
  Object.entries(childTransitions).forEach(([id, transition]) => {
    switch (transition) {
      case 'link':
        out[ChildType.Link] += 1;
        break;
      case 'form_submit':
        out[ChildType.FormSubmit] += 1;
        break;
      case 'typed':
      case 'generated':
        out[ChildType.Typed] += 1;
        break;
      default:
        console.debug(`Unhandled transition type: ${transition}`);
        break;
    }
  });

  return out;
}

interface ChildTypeBubbleProps {
  childType: ChildType;
  count: number;
  selected?: boolean;
  onClick?: () => void;
}

function ChildTypeBubble({
  childType,
  count,
  selected,
  onClick
}: ChildTypeBubbleProps) {
  let text: string;
  switch (childType) {
    case ChildType.Duplicate:
      text = 'Other sessions';
      break;
    case ChildType.Link:
      text = 'Links opened';
      break;
    case ChildType.FormSubmit:
      text = 'Forms submitted';
      break;
    case ChildType.Typed:
      text = 'New Searches'
      break;
  }

  return (
    <Word
      count={count}
      value={text}
      selected={selected}
      onClick={onClick}
    />
  );
}

export default function SearchResultsItem(
  { aggSession, isLast, onEndReached, indent }: SearchResultsItemProps
) {
  const session = aggSession.session;
  const url = new URL(session.url);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [childTypesExpanded, setChildTypesExpanded] = useState<ChildType[]>([]);
  const { ref, inView, entry } = useInView({
    threshold: [0],
    trackVisibility: true,
    delay: 100,
    rootMargin: '400px 0px 0px 0px',
  });

  const childTypeCounts: Record<ChildType, number> = {
    ...processChildTransitions(aggSession.session.childTransitions),
    [ChildType.Duplicate]: aggSession.duplicateSessions.length,
  };

  const [childrenFetched, setChildrenFetched] = useState(false);
  const [children, setChildren] = useState<Record<ChildType, SingleAggregatedSession[]>>({
    [ChildType.Duplicate]: [],
    [ChildType.Typed]: [],
    [ChildType.FormSubmit]: [],
    [ChildType.Link]: [],
  });

  const { runtime, serverClientFactory } = useContext(AppContext);

  useEffect(() => {
    if (childrenFetched) {
      return;
    }
    const containsOther = childTypesExpanded.some((item) => {
      return item !== ChildType.Duplicate;
    });
    if (!containsOther) {
      setChildren({
        ...children,
        [ChildType.Duplicate]: aggSession.duplicateSessions.map(getAggSession)
      });
      return;
    }
    serverClientFactory().then(async (client) => {
      const childrenResp = await client.querySessions({
        filter: dslToClause<Session>({
          parentSessionId: session.id
        })
      });
      const outChildren: Record<ChildType, SessionResponse[]> = {
        [ChildType.Duplicate]: [],
        [ChildType.Typed]: [],
        [ChildType.FormSubmit]: [],
        [ChildType.Link]: [],
      };

      childrenResp.results.forEach((session) => {
        switch (session.transitionType) {
          case 'typed':
          case 'generated':
            outChildren[ChildType.Typed].push(session);
            break;
          case 'link':
            outChildren[ChildType.Link].push(session);
            break;
          case 'form_submit':
            outChildren[ChildType.FormSubmit].push(session);
            break;
          default:
            console.debug(`Unhandled child type: ${session.transitionType}`);
            break;
        }
      });
      const final = Object.fromEntries(
        Object.entries(outChildren).map(([key, value]) => {
          return [key, groupSessions(value)];
        })
      ) as Record<ChildType, SingleAggregatedSession[]>;
      final[ChildType.Duplicate] = aggSession.duplicateSessions.map(getAggSession);
      setChildren(final);
      setChildrenFetched(true);
    });
  }, [
    childTypesExpanded,
    aggSession,
    setChildrenFetched,
    childrenFetched
  ]);

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
        {/*<Connection />*/}
        <div className={styles.searchResultsItemTime}>
          <span title={dateFromSqliteString(session.startedAt).toLocaleString()}>
            {getTimeString(session.startedAt)}
          </span>
        </div>
        <img src={getFaviconUrlPublicApi(url.hostname, 16)} />
        <div className={styles.searchResultsItemContent}>
          <div className={styles.searchResultsItemContentInner}>
            <div className={styles.searchResultsItemTitle}>
              <a href={session.rawUrl} target="_blank">
                <span title={session.title}>
                  <Highlighted title={session.highlightedTitle} />
                </span>
              </a>
            </div>
            <div className={styles.searchResultsItemHost}>
              <span title={session.url}>
                <Highlighted title={session.highlightedHost ?? url.hostname} />
              </span>
            </div>
          </div>
          <div>
            {Object.entries(childTypeCounts).map(([childType, count]) => count > 0 && (
              <ChildTypeBubble
                childType={childType as ChildType}
                count={count}
                selected={childTypesExpanded.includes(childType as ChildType)}
                onClick={() => {
                  const type = childType as ChildType;
                  if (childTypesExpanded.includes(type)) {
                    setChildTypesExpanded(childTypesExpanded.filter((x) => x !== type));
                  } else {
                    setChildTypesExpanded(childTypesExpanded.concat([type]));
                  }
                }}
              />
            ))}
          </div>
        </div>
        <DetailsDropdown session={session} />
      </div>
      {childTypesExpanded.map((childType) => (
        children[childType].map((aggSession) => (
          <SearchResultsItem aggSession={aggSession} indent={(indent || 0) + 1} />
        ))
      ))}
    </>
  );
};
