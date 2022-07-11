import debounce from "lodash/debounce";
import { useState, useContext, useEffect, useMemo, useCallback } from "react";
import Layout from "../components/Layout";
import SearchResults from "../components/SearchResults";
import SearchResultsSideBar from "../components/SearchResultsSideBar";
import Timeline from "../components/Timeline";
import { AppContext } from "../lib";
import type { Session } from "../../models";
import type { SessionResponse, QuerySessionsRequest } from "../../server";
import { Aborted } from "../../server/abort";
import {
  Clause,
  AggregateOperator,
  BinaryOperator,
  IndexToken,
} from "../../server/clause";
import { requestsEqual, dateToSqliteString } from "../../server/utils";

export default function History() {
  const { serverClientFactory, query } = useContext(AppContext);
  const [resultsLoaded, setResultsLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [results, setResults] = useState<SessionResponse[]>([]);
  const [count, setCount] = useState<number>(0);
  const [request, setRequest] = useState<QuerySessionsRequest>({});
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

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
          .finally(() => callback && callback());
      },
      debounceDelay
    );
  }, [setError, setResults, setLoading, setCount]);

  useEffect(() => {
    const newRequest: QuerySessionsRequest = {
      query,
      limit: pageSize,
      isSearch: true,
    };
    const clauses: Clause<Session>[] = [];

    if (selectedTerms.length > 0) {
      const subClauses = selectedTerms.map((term) => ({
        fieldName: IndexToken,
        operator: BinaryOperator.Match,
        value: term,
      }));
      clauses.push({
        operator: AggregateOperator.And,
        clauses: subClauses,
      });
    }
    if (selectedHosts.length > 0) {
      const subClauses = selectedHosts.map((host) => ({
        operator: BinaryOperator.Equals,
        fieldName: "host",
        value: host,
      }));
      clauses.push({
        operator: AggregateOperator.Or,
        clauses: subClauses,
      });
    }
    if (dateRange !== null) {
      const [start, end] = dateRange;

      clauses.push({
        fieldName: "startedAt",
        operator: BinaryOperator.LessThan,
        value: dateToSqliteString(end),
      });
      clauses.push({
        fieldName: "startedAt",
        operator: BinaryOperator.GreaterThanOrEqualTo,
        value: dateToSqliteString(start),
      });
    }

    if (clauses.length === 1) {
      newRequest.filter = clauses[0];
    }
    if (clauses.length > 1) {
      newRequest.filter = {
        operator: AggregateOperator.And,
        clauses,
      };
    }

    if (!requestsEqual(newRequest, request)) {
      setResultsLoaded(false);
      setRequest(newRequest);
    }
  }, [
    query,
    selectedTerms,
    selectedHosts,
    request,
    setRequest,
    dateRange,
    setDateRange,
  ]);

  useEffect(() => {
    const abortController = new AbortController();

    window.scroll(0, 0);
    querySessions({
      ...request,
      abort: abortController.signal
    }, () => {
      if (!abortController.signal.aborted) {
        setResultsLoaded(true);
      }
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
    <Layout>
      <h1>History</h1>
      <SearchResultsSideBar
        loading={!resultsLoaded}
        request={request}
        selectedHosts={selectedHosts}
        setSelectedHosts={setSelectedHosts}
        selectedTerms={selectedTerms}
        setSelectedTerms={setSelectedTerms}
      />
      <Timeline
        loading={!resultsLoaded}
        request={request}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      {error ? (
        <p>An error occurred while loading search results.</p>
      ) : (
        <SearchResults
          sessions={results}
          isLoading={loading}
          onEndReached={onEndReached}
        />
      )}
    </Layout>
  );
}
