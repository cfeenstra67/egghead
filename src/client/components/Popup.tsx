import debounce from "lodash/debounce";
import { useContext, useState, useMemo, useEffect, useCallback } from "react";
import Bubble from "./Bubble";
import Card from "./Card";
import { AppContext } from "../lib/context";
import type { Session } from "../../models";
import PopupLayout from "./PopupLayout";
import PopupSearchBar from "./PopupSearchBar";
import SearchResults from "./SearchResults";
import type { SessionResponse, QuerySessionsRequest } from "../../server";
import { Clause, BinaryOperator, AggregateOperator } from "../../server/clause";
import { Aborted } from "../../server/abort";
import { requestsEqual } from "../../server/utils";
import styles from "../styles/Popup.module.css";
import utilStyles from "../styles/utils.module.css";

export default function Popup() {
  const { serverClientFactory, query, openHistory, getCurrentUrl } = useContext(AppContext);
  const [resultsLoaded, setResultsLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [results, setResults] = useState<SessionResponse[]>([]);
  const [count, setCount] = useState<number>(0);
  const [request, setRequest] = useState<QuerySessionsRequest>({});
  const [activeSessionsOnly, setActiveSessionsOnly] = useState(false);
  const [currentDomainOnly, setCurrentDomainOnly] = useState(false);

  const debounceDelay = 150;
  const pageSize = 200;

  const querySessions = useMemo(() => {
    return debounce(
      (
        request: QuerySessionsRequest,
        callback?: () => void,
        existingResults?: SessionResponse[],
      ) => {
        setLoading(true);
        serverClientFactory()
          .then(async (client) => {
            const response = await client.querySessions(request);
            setResults((existingResults || []).concat(response.results));
            setCount(response.totalCount);
            if (!request.abort?.aborted) {
              setError(false);
              setLoading(false);
            }
          })
          .catch((err) => {
            if (err instanceof Aborted) {
              return;
            }
            console.trace(`Error querying "${query}"`, err);
            setError(true);
            setLoading(false);
          })
          .finally(() => {
            if (!request.abort?.aborted && callback) {
              callback();
            }
          });
      },
      debounceDelay
    );
  }, [setError, setResults, setLoading, setCount]);

  useEffect(() => {
    let active = true;

    async function load() {
      const newRequest: QuerySessionsRequest = {
        query,
        limit: pageSize,
        isSearch: true,
      };

      const clauses: Clause<Session>[] = [];

      if (currentDomainOnly) {
        const currentUrl = await getCurrentUrl();
        if (!active) {
          return;
        }
        clauses.push({
          operator: BinaryOperator.Equals,
          fieldName: 'host',
          value: new URL(currentUrl).hostname,
        });
      }
      if (activeSessionsOnly) {
        clauses.push({
          operator: BinaryOperator.Equals,
          fieldName: 'endedAt',
          value: null
        });
      }

      if (clauses.length === 1) {
        newRequest.filter = clauses[0]
      } else if (clauses.length > 1) {
        newRequest.filter = {
          operator: AggregateOperator.And,
          clauses,
        };
      }

      if (!requestsEqual(newRequest, request)) {
        setResultsLoaded(false);
        setRequest(newRequest);
      }
    }

    load();
    return () => { active = false; };
  }, [query, request, activeSessionsOnly, currentDomainOnly]);

  useEffect(() => {
    const abortController = new AbortController();

    window.scroll(0, 0);
    querySessions({
      ...request,
      abort: abortController.signal
    }, () => {
      setResultsLoaded(true);
    });

    return () => abortController.abort();
  }, [querySessions, request]);

  const onEndReached = useCallback(() => {
    if (results.length >= count) {
      return;
    }
    const abortController = new AbortController();
    querySessions({
      ...request,
      skip: results.length,
      abort: abortController.signal
    }, undefined, results);

    return () => abortController.abort();
  }, [results, count, request, querySessions]);

  return (
    <PopupLayout>
      <PopupSearchBar />
      <div className={styles.popupButtons}>
        <Bubble onClick={openHistory}>Open History</Bubble>
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
        {error ? (
          <p>An error occurred while loading search results.</p>
        ) : (
          <SearchResults
            sessions={results}
            isLoading={loading}
            onEndReached={onEndReached}
          />
        )}
      </div>
    </PopupLayout>
  );
}
