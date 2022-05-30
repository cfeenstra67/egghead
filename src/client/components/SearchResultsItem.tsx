import * as _ from "lodash";
import { useState, createRef, useEffect, useContext, RefObject } from "react";
import { useInView } from "react-intersection-observer";
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { Link } from "wouter";
import Word from "./Word";
import Connection from "./Connection";
import Highlighted from "./Highlighted";
import EllipsisIcon from "../icons/ellipsis.svg";
import { AppContext } from "../lib/context";
import { getFaviconUrlPublicApi } from "../lib/favicon";
import { Session } from "../../models";
import { SessionResponse } from "../../server";
import { dslToClause } from "../../server/clause";
import { dateFromSqliteString } from "../../server/utils";
import styles from "../styles/SearchResults.module.css";

function cleanRawUrl(url: string): string {
  const urlObj = new URL(url);
  urlObj.hash = "";
  return urlObj.href;
}

function getTimeString(date: string): string {
  const [time, amPm] = dateFromSqliteString(date)
    .toLocaleTimeString()
    .split(" ");
  const timeString = time.split(":").slice(0, 2).join(":");
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
    };

    const cancel = () =>
      document.removeEventListener("click", handleClickOutside, true);

    document.addEventListener("click", handleClickOutside, true);

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
          <Link to={`/session/${session.id}`}>Details</Link>
        </div>
      )}
    </div>
  );
}

enum ChildType {
  Link = "LINK",
  FormSubmit = "FORM_SUBMIT",
  Typed = "TYPED",
  Duplicate = "DUPLICATE",
}

interface SingleAggregatedSession {
  type: "single";
  session: SessionResponse;
  duplicateSessions: SessionResponse[];
  allSessionIds: string[];
  nextSessionIds: string[];
}

export function groupSessions(
  sessions: SessionResponse[]
): SingleAggregatedSession[] {
  const sessionsById = Object.fromEntries(
    sessions.map((session) => {
      return [session.id, session];
    })
  );
  const grouped: Record<string, SessionResponse[]> = {};
  sessions.forEach((session) => {
    let outUrl = cleanRawUrl(session.rawUrl);
    if (
      session.parentSessionId &&
      session.transitionType === "reload" &&
      sessionsById[session.parentSessionId]
    ) {
      outUrl = cleanRawUrl(sessionsById[session.parentSessionId].rawUrl);
    }
    if (!grouped[outUrl]) {
      grouped[outUrl] = [];
    }
    grouped[outUrl].push(session);
  });
  return Object.entries(grouped).map((tup) => {
    const sessions = tup[1];
    return {
      type: "single",
      session: sessions[0],
      duplicateSessions: sessions.slice(1),
      allSessionIds: sessions.map((session) => session.id),
      nextSessionIds: sessions.flatMap((session) => {
        return session.nextSessionId ? [session.nextSessionId] : [];
      }),
    };
  });
}

function getAggSession(session: SessionResponse): SingleAggregatedSession {
  return {
    type: "single",
    session,
    duplicateSessions: [],
    allSessionIds: [session.id],
    nextSessionIds: session.nextSessionId ? [session.nextSessionId] : [],
  };
}

function processChildTransitions(
  aggSession: SingleAggregatedSession
): Omit<Record<ChildType, number>, ChildType.Duplicate> {
  const out = {
    [ChildType.Link]: 0,
    [ChildType.FormSubmit]: 0,
    [ChildType.Typed]: 0,
  };
  [aggSession.session, ...aggSession.duplicateSessions].forEach((session) => {
    Object.entries(session.childTransitions).forEach((tup) => {
      const transition = tup[1];
      switch (transition) {
        case "link":
          out[ChildType.Link] += 1;
          break;
        case "form_submit":
          out[ChildType.FormSubmit] += 1;
          break;
        case "typed":
        case "generated":
          out[ChildType.Typed] += 1;
          break;
        default:
          console.debug(`Unhandled transition type: ${transition}`);
          break;
      }
    });
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
  onClick,
}: ChildTypeBubbleProps) {
  let text: string;
  switch (childType) {
    case ChildType.Duplicate:
      text = "Other sessions";
      break;
    case ChildType.Link:
      text = "Links opened";
      break;
    case ChildType.FormSubmit:
      text = "Forms submitted";
      break;
    case ChildType.Typed:
      text = "New Searches";
      break;
  }

  return (
    <Word count={count} value={text} selected={selected} onClick={onClick} />
  );
}

interface SingleAggregatedSearchResultsItemProps {
  aggSession: SingleAggregatedSession;
  isLast?: boolean;
  onEndReached?: () => void;
  indent?: number;
  hideChildTypes?: boolean;
  childTypesExpanded: ChildType[];
  setChildTypesExpanded: (types: ChildType[]) => void;
  childrenSessions: Record<
    string,
    Record<ChildType, SingleAggregatedSession[]>
  >;
}

function SingleAggregatedSearchResultsItem({
  aggSession,
  childrenSessions,
  childTypesExpanded,
  setChildTypesExpanded,
  hideChildTypes,
  isLast,
  onEndReached,
  indent,
  ...transitionProps
}: SingleAggregatedSearchResultsItemProps) {
  const [isInView, setIsInView] = useState<boolean>(false);
  const session = aggSession.session;
  const url = new URL(session.url);
  const { ref, inView } = useInView({
    threshold: [0],
    trackVisibility: true,
    delay: 100,
    rootMargin: "400px 0px 0px 0px",
  });

  const childTypeCounts: Record<ChildType, number> = {
    ...processChildTransitions(aggSession),
    [ChildType.Duplicate]: aggSession.duplicateSessions.length,
  };

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
  }, [inView, isInView, setIsInView]);

  return (
    <>
      <CSSTransition
        {...transitionProps}
        key={`${indent ?? 0} ${session.id}`}
        timeout={200}
        appear={(indent ?? 0) > 0}
        classNames={{
          appear: styles.itemEnter,
          enter: styles.itemEnter,
          exit: styles.itemExit,
        }}
      >
        <div
          className={
            (indent || 0) > 0
              ? styles.searchResultsItemChild
              : styles.searchResultsItem
          }
          ref={ref}
          style={{ marginLeft: 24 * (indent || 0) + "px" }}
        >
          <Connection />
          <div className={styles.searchResultsItemTime}>
            <span
              title={dateFromSqliteString(session.startedAt).toLocaleString()}
            >
              {getTimeString(session.startedAt)}
            </span>
          </div>
          <img src={getFaviconUrlPublicApi(url.hostname, 16)} />
          <div className={styles.searchResultsItemContent}>
            <div className={styles.searchResultsItemContentInner}>
              <div className={styles.searchResultsItemTitle}>
                <a href={session.rawUrl} target="_blank" rel="noreferrer">
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
            {!hideChildTypes && (
              <div>
                {Object.entries(childTypeCounts).map(
                  ([childType, count]) =>
                    count > 0 && (
                      <ChildTypeBubble
                        childType={childType as ChildType}
                        count={count}
                        selected={childTypesExpanded.includes(
                          childType as ChildType
                        )}
                        onClick={() => {
                          const type = childType as ChildType;
                          if (childTypesExpanded.includes(type)) {
                            setChildTypesExpanded(
                              childTypesExpanded.filter((x) => x !== type)
                            );
                          } else {
                            setChildTypesExpanded(
                              childTypesExpanded.concat([type])
                            );
                          }
                        }}
                      />
                    )
                )}
              </div>
            )}
          </div>
          <DetailsDropdown session={session} />
        </div>
      </CSSTransition>
      <TransitionGroup component={null}>
        {Object.values(ChildType).map((childType) =>
          (transitionProps as any)['in'] ? childrenSessions[aggSession.session.id]?.[childType]?.map(
            (aggSession2) => {
              if (childType === ChildType.Duplicate) {
                const sessionChildren = childTypesExpanded.flatMap((type) => {
                  return childrenSessions[aggSession2.session.id]?.[type] ?? [];
                });
                if (
                  childTypesExpanded.includes(childType) ||
                  sessionChildren.length > 0
                ) {
                  const newChildren = _.pick(childrenSessions, [
                    aggSession2.session.id,
                  ]);
                  return (
                    <SingleAggregatedSearchResultsItem
                      key={aggSession2.session.id}
                      aggSession={aggSession2}
                      childTypesExpanded={childTypesExpanded}
                      setChildTypesExpanded={setChildTypesExpanded}
                      hideChildTypes
                      childrenSessions={newChildren}
                      isLast={false}
                      onEndReached={() => {}}
                      indent={(indent || 0) + 1}
                    />
                  );
                }
              } else if (childTypesExpanded.includes(childType)) {
                return (
                  <SearchResultsItem
                    key={aggSession2.session.id}
                    aggSession={aggSession2}
                    indent={(indent || 0) + 1}
                  />
                );
              }
              return <></>;
            }
          ) : <></>
        )}
      </TransitionGroup>
    </>
  );
}

export interface SearchResultsItemProps {
  connectToRefs?: RefObject<any>[];
  aggSession: SingleAggregatedSession;
  isLast?: boolean;
  onEndReached?: () => void;
  indent?: number;
}

export default function SearchResultsItem({
  aggSession,
  isLast,
  onEndReached,
  indent,
  ...transitionProps
}: SearchResultsItemProps) {
  const [childTypesExpanded, setChildTypesExpanded] = useState<ChildType[]>([]);

  const [childrenFetched, setChildrenFetched] = useState(false);
  type ChildrenType = Record<
    string,
    Record<ChildType, SingleAggregatedSession[]>
  >;
  const [children, setChildren] = useState<ChildrenType>({});

  const { serverClientFactory } = useContext(AppContext);

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
        [aggSession.session.id]: {
          [ChildType.Duplicate]:
            aggSession.duplicateSessions.map(getAggSession),
          [ChildType.Link]: [],
          [ChildType.FormSubmit]: [],
          [ChildType.Typed]: [],
        },
      });
      return;
    }
    serverClientFactory().then(async (client) => {
      const sessionIds = [
        aggSession.session.id,
        ...aggSession.duplicateSessions.map((session) => session.id),
      ];
      const childrenResp = await client.querySessions({
        filter: dslToClause<Session>({
          parentSessionId: { IN: sessionIds },
        }),
      });
      const outChildren: Record<
        string,
        Record<ChildType, SessionResponse[]>
      > = Object.fromEntries(
        sessionIds.map((sessionId) => {
          let duplicates: SessionResponse[] = [];
          if (sessionId === aggSession.session.id) {
            duplicates = aggSession.duplicateSessions;
          }

          return [
            sessionId,
            {
              [ChildType.Duplicate]: duplicates,
              [ChildType.Typed]: [],
              [ChildType.FormSubmit]: [],
              [ChildType.Link]: [],
            },
          ];
        })
      );

      childrenResp.results.forEach((session) => {
        switch (session.transitionType) {
          case "typed":
          case "generated":
            outChildren[session.parentSessionId as string][
              ChildType.Typed
            ].push(session);
            break;
          case "link":
            outChildren[session.parentSessionId as string][ChildType.Link].push(
              session
            );
            break;
          case "form_submit":
            outChildren[session.parentSessionId as string][
              ChildType.FormSubmit
            ].push(session);
            break;
          default:
            console.debug(`Unhandled child type: ${session.transitionType}`);
            break;
        }
      });
      const final = Object.fromEntries(
        Object.entries(outChildren).map(([key, value]) => {
          return [
            key,
            Object.fromEntries(
              Object.entries(value).map(([key2, value2]) => {
                if (key2 === ChildType.Duplicate) {
                  return [key2, value2.map(getAggSession)];
                }
                return [key2, groupSessions(value2)];
              })
            ),
          ];
        })
      ) as ChildrenType;
      setChildren(final);
      setChildrenFetched(true);
    });
  }, [childTypesExpanded, aggSession, setChildrenFetched, childrenFetched]);

  return (
    <SingleAggregatedSearchResultsItem
      {...transitionProps}
      aggSession={aggSession}
      isLast={isLast}
      onEndReached={onEndReached}
      indent={indent}
      childrenSessions={children}
      childTypesExpanded={childTypesExpanded}
      setChildTypesExpanded={setChildTypesExpanded}
    />
  );
}
