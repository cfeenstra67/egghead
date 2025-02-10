import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Link2, MoreVertical, Send, Trash2 } from "lucide-react";
import { type RefObject, useContext, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { Link } from "wouter";
import parentLogger from "../../logger";
import type { Session } from "../../models";
import type { SessionResponse } from "../../server";
import { BinaryOperator, dslToClause } from "../../server/clause";
import { dateFromSqliteString } from "../../server/utils";
import { AppContext } from "../lib/context";
import { getFaviconUrlPublicApi } from "../lib/favicon";
import { cn } from "../lib/utils";
import { DeleteSessionModal } from "./DeleteSessionModal";
import ExternalLink, { useExternalLinkOpener } from "./ExternalLink";
import Highlighted from "./Highlighted";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";

const logger = parentLogger.child({ context: "SearchResultsItem" });

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
  sessions: SessionResponse[],
): SingleAggregatedSession[] {
  const sessionsById = Object.fromEntries(
    sessions.map((session) => {
      return [session.id, session];
    }),
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

export function getAggSession(
  session: SessionResponse,
): SingleAggregatedSession {
  return {
    type: "single",
    session,
    duplicateSessions: [],
    allSessionIds: [session.id],
    nextSessionIds: session.nextSessionId ? [session.nextSessionId] : [],
  };
}

function processChildTransitions(
  aggSession: SingleAggregatedSession,
): Omit<Record<ChildType, number>, ChildType.Duplicate> {
  const out = {
    [ChildType.Link]: 0,
    [ChildType.FormSubmit]: 0,
    [ChildType.Typed]: 0,
  };
  [aggSession.session, ...aggSession.duplicateSessions].forEach((session) => {
    if (!session.childTransitions) {
      return;
    }
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
          logger.debug(`Unhandled transition type: ${transition}`);
          break;
      }
    });
  });

  return out;
}

interface SingleAggregatedSearchResultsItemProps {
  aggSession: SingleAggregatedSession;
  isLast?: boolean;
  onEndReached?: () => void;
  indent?: number;
  hideChildTypes?: boolean;
  childTypesExpanded: ChildType[];
  setChildTypesExpanded: (types: ChildType[]) => void;
  showControls?: boolean;
  showChildren?: "short" | "full";
  animate?: boolean;
  childrenSessions: Record<
    string,
    Record<ChildType, SingleAggregatedSession[]>
  >;
  showChecks?: boolean;
  checked?: (id: string) => boolean;
  setChecked?: (ids: string[], checked: boolean) => void;
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
  showControls,
  showChildren,
  animate,
  showChecks,
  checked,
  setChecked,
  ...transitionProps
}: SingleAggregatedSearchResultsItemProps) {
  const [isInView, setIsInView] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
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

  const openLink = useExternalLinkOpener(true);
  const tabId = session.endedAt ? undefined : session.tabId;

  return (
    <>
      <DeleteSessionModal
        request={{
          isSearch: true,
          filter: {
            operator: BinaryOperator.In,
            fieldName: "id",
            value: aggSession.allSessionIds,
          },
        }}
        open={showDelete}
        onOpenChanged={setShowDelete}
        onDelete={() => setShowDelete(false)}
      />
      <CSSTransition
        {...transitionProps}
        key={`${indent ?? 0} ${session.id}`}
        timeout={200}
        classNames={{ exit: "animate__fadeOutRight" }}
      >
        <div
          data-session-id={session.id}
          className={cn(
            "flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 group",
            { "animate__animated animate__fadeInRight": animate },
          )}
          ref={ref}
          style={
            {
              marginLeft: `${3 * (indent || 0)}rem`,
              "--animate-duration": "200ms",
            } as React.CSSProperties
          }
        >
          <div
            className={cn(
              "w-6 h-6 flex-shrink-0 flex items-center justify-center text-primary text-xs",
              { "rounded-full bg-primary/10": !showChecks },
            )}
          >
            {showChecks ? (
              <div>
                <Checkbox
                  checked={checked?.(session.id)}
                  onCheckedChange={(state) => {
                    if (state === "indeterminate") {
                      return;
                    }
                    setChecked?.(aggSession.allSessionIds, state);
                  }}
                />
              </div>
            ) : (
              <img
                src={getFaviconUrlPublicApi(url.hostname, 16)}
                alt={`Favicon for ${url.hostname}`}
                onClick={(evt) => openLink(session.rawUrl, tabId)}
              />
            )}
          </div>
          <ExternalLink
            newTab
            className="flex-grow min-w-0"
            href={session.rawUrl}
            tabId={session.endedAt ? undefined : session.tabId}
            rel="noreferrer"
          >
            <div className="text-sm font-medium leading-none truncate block md:max-w-[85%] lg:max-w-[90%]">
              <span title={session.title}>
                <Highlighted title={session.highlightedTitle} />
              </span>
            </div>
            <div className="flex items-center mt-1 space-x-2 text-xs text-muted-foreground max-w-[60%]">
              <span className="truncate block" title={session.rawUrl}>
                <Highlighted title={session.highlightedHost} />
              </span>
              <Separator className="h-3 flex-shrink-0" orientation="vertical" />
              <span
                className="flex-shrink-0"
                title={dateFromSqliteString(session.startedAt).toLocaleString()}
              >
                {getTimeString(session.startedAt)}
              </span>
            </div>
          </ExternalLink>
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            {childTypeCounts.FORM_SUBMIT > 0 &&
            !hideChildTypes &&
            showChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className={clsx({
                  "text-xs flex items-center whitespace-nowrap": true,
                  "bg-muted text-accent-foreground":
                    childTypesExpanded.includes(ChildType.FormSubmit),
                })}
                onClick={() => {
                  if (childTypesExpanded.includes(ChildType.FormSubmit)) {
                    setChildTypesExpanded(
                      childTypesExpanded.filter(
                        (t) => t !== ChildType.FormSubmit,
                      ),
                    );
                  } else {
                    setChildTypesExpanded(
                      childTypesExpanded.concat(ChildType.FormSubmit),
                    );
                  }
                }}
              >
                <Send className="h-4 w-4 mr-1" />
                {showChildren === "full" ? (
                  <span>
                    {childTypeCounts.FORM_SUBMIT} form
                    {childTypeCounts.FORM_SUBMIT > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>{childTypeCounts.FORM_SUBMIT}</span>
                )}
              </Button>
            ) : null}
            {childTypeCounts.LINK > 0 && !hideChildTypes && showChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn("text-xs flex items-center whitespace-nowrap", {
                  "bg-muted text-accent-foreground":
                    childTypesExpanded.includes(ChildType.Link),
                })}
                onClick={() => {
                  if (childTypesExpanded.includes(ChildType.Link)) {
                    setChildTypesExpanded(
                      childTypesExpanded.filter((t) => t !== ChildType.Link),
                    );
                  } else {
                    setChildTypesExpanded(
                      childTypesExpanded.concat(ChildType.Link),
                    );
                  }
                }}
              >
                <Link2 className="h-4 w-4 mr-1" />
                {showChildren === "full" ? (
                  <span>
                    {childTypeCounts.LINK} link
                    {childTypeCounts.LINK > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>{childTypeCounts.LINK}</span>
                )}
              </Button>
            ) : null}
            {showControls && showChildren === "short" ? (
              <Link href={`/session/${aggSession.session.id}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8 opacity-0 group-hover:opacity-100", {
                    "w-4": showChildren === "short",
                  })}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </Link>
            ) : showControls ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 opacity-0 group-hover:opacity-100", {
                      "w-4": showChildren === "short",
                    })}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={`/session/${aggSession.session.id}`}>
                      <Info /> <span>Details</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(evt) => {
                      setShowDelete(true);
                      evt.preventDefault();
                    }}
                  >
                    <Trash2 /> <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <AnimatePresence>
            {false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="ml-8 pl-4 border-l border-muted"
              >
                {/* Placeholder for child items */}
                <div className="p-2 rounded-lg hover:bg-muted/50">
                  <h4 className="text-sm font-medium">Child Link 1</h4>
                  <p className="text-xs text-muted-foreground">
                    https://example.com/child1
                  </p>
                </div>
                <div className="p-2 rounded-lg hover:bg-muted/50">
                  <h4 className="text-sm font-medium">Child Link 2</h4>
                  <p className="text-xs text-muted-foreground">
                    https://example.com/child2
                  </p>
                </div>
                <div className="p-2 rounded-lg hover:bg-muted/50">
                  <h4 className="text-sm font-medium">Child Link 3</h4>
                  <p className="text-xs text-muted-foreground">
                    https://example.com/child3
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CSSTransition>
      <TransitionGroup component={null}>
        {Object.values(ChildType).map((childType) =>
          (transitionProps as any).in
            ? childrenSessions[aggSession.session.id]?.[childType]?.map(
                (aggSession2) => {
                  if (childType === ChildType.Duplicate) {
                    const sessionChildren = childTypesExpanded.flatMap(
                      (type) => {
                        return (
                          childrenSessions[aggSession2.session.id]?.[type] ?? []
                        );
                      },
                    );
                    if (
                      childTypesExpanded.includes(childType) ||
                      sessionChildren.length > 0
                    ) {
                      const newChildren = {
                        [aggSession2.session.id]:
                          childrenSessions[aggSession2.session.id],
                      };
                      return (
                        <SingleAggregatedSearchResultsItem
                          animate={animate}
                          showChildren={showChildren}
                          showControls={showControls}
                          key={aggSession2.session.id}
                          aggSession={aggSession2}
                          childTypesExpanded={childTypesExpanded}
                          setChildTypesExpanded={setChildTypesExpanded}
                          hideChildTypes
                          childrenSessions={newChildren}
                          indent={(indent || 0) + 1}
                          showChecks={showChecks}
                          checked={checked}
                          setChecked={setChecked}
                        />
                      );
                    }
                  } else if (childTypesExpanded.includes(childType)) {
                    return (
                      <SearchResultsItem
                        animate={animate}
                        showChildren={showChildren}
                        showControls={showControls}
                        key={aggSession2.session.id}
                        aggSession={aggSession2}
                        indent={(indent || 0) + 1}
                        showChecks={showChecks}
                        checked={checked}
                        setChecked={setChecked}
                      />
                    );
                  }
                  return null;
                },
              )
            : null,
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
  showControls?: boolean;
  showChildren?: "short" | "full";
  animate?: boolean;
  showChecks?: boolean;
  checked?: (id: string) => boolean;
  setChecked?: (ids: string[], checked: boolean) => void;
}

export default function SearchResultsItem({
  aggSession,
  isLast,
  onEndReached,
  indent,
  showControls,
  showChildren,
  animate,
  showChecks,
  checked,
  setChecked,
  ...transitionProps
}: SearchResultsItemProps) {
  const [childTypesExpanded, setChildTypesExpanded] = useState<ChildType[]>([]);

  // const [childrenFetched, setChildrenFetched] = useState(false);
  type ChildrenType = Record<
    string,
    Record<ChildType, SingleAggregatedSession[]>
  >;
  // const [children, setChildren] = useState<ChildrenType>({});

  const { serverClientFactory } = useContext(AppContext);

  const childrenQuery = useQuery({
    queryKey: [
      "history",
      aggSession.session.id,
      "children",
      childTypesExpanded,
    ],
    queryFn: async () => {
      const containsOther = childTypesExpanded.some((item) => {
        return item !== ChildType.Duplicate;
      });
      if (!containsOther) {
        return {
          [aggSession.session.id]: {
            [ChildType.Duplicate]:
              aggSession.duplicateSessions.map(getAggSession),
            [ChildType.Link]: [],
            [ChildType.FormSubmit]: [],
            [ChildType.Typed]: [],
          },
        };
      }

      const client = await serverClientFactory();

      const sessionIds = [
        aggSession.session.id,
        ...aggSession.duplicateSessions.map((session) => session.id),
      ];
      const childrenResp = await client.querySessions({
        filter: dslToClause<Session>({
          parentSessionId: { IN: sessionIds },
        }),
        isSearch: true,
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
        }),
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
              session,
            );
            break;
          case "form_submit":
            outChildren[session.parentSessionId as string][
              ChildType.FormSubmit
            ].push(session);
            break;
          default:
            logger.debug(`Unhandled child type: ${session.transitionType}`);
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
              }),
            ),
          ];
        }),
      ) as ChildrenType;

      return final;
    },
  });

  return (
    <SingleAggregatedSearchResultsItem
      {...transitionProps}
      animate={animate}
      showControls={showControls}
      showChildren={showChildren}
      aggSession={aggSession}
      isLast={isLast}
      onEndReached={onEndReached}
      indent={indent}
      childrenSessions={childrenQuery.data ?? {}}
      childTypesExpanded={childTypesExpanded}
      setChildTypesExpanded={setChildTypesExpanded}
      showChecks={showChecks}
      checked={checked}
      setChecked={setChecked}
    />
  );
}
