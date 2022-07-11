import debounce from "lodash/debounce";
import { useState, useContext, useEffect, useMemo, useCallback } from "react";
import Card from "../components/Card";
import Layout from "../components/Layout";
import SearchResults from "../components/SearchResults";
import SessionCard from "../components/SessionCard";
import Timeline from "../components/Timeline";
import { AppContext } from "../lib";
import type { Session } from "../../models";
import type { SessionResponse, QuerySessionsRequest } from "../../server";
import { Aborted } from "../../server/abort";
import {
  Clause,
  AggregateOperator,
  BinaryOperator,
} from "../../server/clause";
import { requestsEqual, dateToSqliteString } from "../../server/utils";
import utilStyles from "../styles/utils.module.css";

export interface SessionDetailProps {
  sessionId: string;
}

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const { serverClientFactory } = useContext(AppContext);

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [resultsLoaded, setResultsLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [results, setResults] = useState<SessionResponse[]>([]);
  const [count, setCount] = useState<number>(0);
  const [request, setRequest] = useState<QuerySessionsRequest>({});
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
            console.trace(`Error querying "${sessionId}"`, err);
            setError(true);
            setLoading(false);
          })
          .finally(() => {
            if (!request.abort?.aborted) {
              callback && callback();
            }
          });
      },
      debounceDelay
    );
  }, [setError, setResults, setLoading, setCount]);

  useEffect(() => {
    if (session && sessionId !== session.id) {
      setSession(null);
      setSessionError(null);
      return;
    }
    if (session || sessionError) {
      return;
    }

    const abortController = new AbortController();

    async function load() {
      const client = await serverClientFactory();
      try {
        const response = await client.querySessions({
          filter: {
            operator: BinaryOperator.Equals,
            fieldName: 'id',
            value: sessionId,
          },
          abort: abortController.signal,
        });
        if (response.results.length > 0) {
          setSession(response.results[0]);
        } else {
          setSessionError('Session not found');
        }
      } catch (error: any) {
        setSessionError(error.toString());
      }
    }

    load();
    return () => abortController.abort();
  }, [sessionId, session, sessionError]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const newRequest: QuerySessionsRequest = {
      limit: pageSize,
      isSearch: true,
    };

    const clauses: Clause<Session>[] = [
      {
        operator: BinaryOperator.Equals,
        fieldName: 'url',
        value: session.url,
      }
    ];

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
    session,
    request,
    setRequest,
    dateRange,
  ]);

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
    <Layout full>
      <div className={utilStyles.row}>
        <button
          className={utilStyles.button}
          onClick={() => history.back()}
        >
          Back
        </button>
        <h1 className={utilStyles.marginLeft3}>
          Session Detail
        </h1>
      </div>
      {session !== null ? (
        <SessionCard session={session} />
      ) : sessionError !== null ? (
        <Card>
          Error loading session: {sessionError}.
        </Card>
      ) : (
        <Card>
          Loading session...
        </Card>
      )}
      <div className={utilStyles.marginTop2}>
        <Timeline
          loading={!resultsLoaded}
          request={request}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </div>
      <div className={utilStyles.marginTop2}>
        {error ? (
          <p>An error occurred while loading other sessions.</p>
        ) : (
          <SearchResults
            sessions={results}
            isLoading={loading}
            onEndReached={onEndReached}
          />
        )}
      </div>
    </Layout>
  );
}
