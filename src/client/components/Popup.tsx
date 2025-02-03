import { useCallback, useContext, useState } from "react";
import type { Session } from "../../models";
import type { QuerySessionsRequest } from "../../server";
import { Aborted } from "../../server/abort";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
} from "../../server/clause";
import { AppContext } from "../lib/context";
import { SessionQueryState, useSessionQuery } from "../lib/session-query";
import styles from "../styles/Popup.module.css";
import utilStyles from "../styles/utils.module.css";
import Bubble from "./Bubble";
import PopupLayout from "./PopupLayout";
import PopupSearchBar from "./PopupSearchBar";
import SearchResults from "./SearchResults";

export default function Popup() {
  const { query, runtime } = useContext(AppContext);
  const [activeSessionsOnly, setActiveSessionsOnly] = useState(false);
  const [currentDomainOnly, setCurrentDomainOnly] = useState(false);

  const getRequest = useCallback(
    async (abort: AbortSignal) => {
      const newRequest: QuerySessionsRequest = {
        query,
        isSearch: true,
      };

      const clauses: Clause<Session>[] = [];

      if (currentDomainOnly) {
        const currentUrl = await runtime.getCurrentUrl();
        if (abort.aborted) {
          throw new Aborted();
        }
        clauses.push({
          operator: BinaryOperator.Equals,
          fieldName: "host",
          value: new URL(currentUrl).hostname,
        });
      }
      if (activeSessionsOnly) {
        clauses.push({
          operator: BinaryOperator.Equals,
          fieldName: "endedAt",
          value: null,
        });
      }

      if (clauses.length === 1) {
        newRequest.filter = clauses[0];
      } else if (clauses.length > 1) {
        newRequest.filter = {
          operator: AggregateOperator.And,
          clauses,
        };
      }
      return newRequest;
    },
    [query, activeSessionsOnly, currentDomainOnly],
  );

  const { results, state, loadNextPage } = useSessionQuery({
    getRequest,
    onChange: () => window.scroll(0, 0),
  });

  return (
    <PopupLayout>
      <PopupSearchBar />
      <div className={styles.popupButtons}>
        <Bubble onClick={() => runtime.openHistory()}>Open History</Bubble>
        <Bubble
          onClick={() => setActiveSessionsOnly(!activeSessionsOnly)}
          selected={activeSessionsOnly}
        >
          Active Sessions Only
        </Bubble>
        <Bubble
          onClick={() => setCurrentDomainOnly(!currentDomainOnly)}
          selected={currentDomainOnly}
        >
          Current Domain Only
        </Bubble>
      </div>
      <div className={utilStyles.marginTop}>
        {state === SessionQueryState.Error ? (
          <p>An error occurred while loading search results.</p>
        ) : (
          <SearchResults
            sessions={results}
            isLoading={state === SessionQueryState.Loading}
            onEndReached={loadNextPage}
          />
        )}
      </div>
    </PopupLayout>
  );
}
