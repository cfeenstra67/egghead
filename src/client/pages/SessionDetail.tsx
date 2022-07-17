import { useState, useCallback, useContext } from "react";
import Card from "../components/Card";
import Layout from "../components/Layout";
import SearchResults from "../components/SearchResults";
import SessionCard from "../components/SessionCard";
import Timeline from "../components/Timeline";
import { AppContext } from "../lib";
import { useSessionQuery, SessionQueryState } from "../lib/session-query";
import type { Session } from "../../models";
import type { QuerySessionsRequest } from "../../server";
import { Aborted } from "../../server/abort";
import {
  Clause,
  AggregateOperator,
  BinaryOperator,
} from "../../server/clause";
import { dateToSqliteString } from "../../server/utils";
import utilStyles from "../styles/utils.module.css";

export interface SessionDetailProps {
  sessionId: string;
}

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const { runtime } = useContext(AppContext);

  const getSessionRequest = useCallback(async () => {
    return {
      filter: {
        operator: BinaryOperator.Equals,
        fieldName: 'id' as const,
        value: sessionId,
      }
    };
  }, [sessionId]);

  const { 
    results: sessionResults,
    state: sessionQueryState,
    error: sessionQueryError
  } = useSessionQuery({
    getRequest: getSessionRequest
  });
  const session = sessionResults[0];

  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

  const getOtherSessionsRequest = useCallback(async () => {
    if (!session) {
      throw new Aborted();
    }

    const newRequest: QuerySessionsRequest = {
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

    return newRequest;
  }, [session, dateRange]);

  const {
    results: otherSessionsResults,
    state: otherSessionsState,
    loadNextPage: otherSessionsLoadNextPage,
    initialLoadComplete: otherSessionsInitialLoadComplete,
    request: otherSessionsRequest,
  } = useSessionQuery({
    getRequest: getOtherSessionsRequest
  });

  return (
    <Layout full>
      <div className={utilStyles.row}>
        <button
          className={utilStyles.button}
          onClick={() => runtime.goBack()}
        >
          Back
        </button>
        <h1 className={utilStyles.marginLeft3}>
          Session Detail
        </h1>
      </div>
      {session ? (
        <SessionCard session={session} />
      ) : sessionQueryState === SessionQueryState.Loading ? (
        <Card>
          Loading session...
        </Card>
      ) : sessionQueryError ? (
        <Card>
          Error loading session: {sessionQueryError}.
        </Card>
      ) : (
        <Card>
          Session not found.
        </Card>
      )}
      <div className={utilStyles.marginTop2}>
        <Timeline
          loading={!otherSessionsInitialLoadComplete}
          request={otherSessionsRequest}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </div>
      <div className={utilStyles.marginTop2}>
        {otherSessionsState === SessionQueryState.Error ? (
          <p>An error occurred while loading other sessions.</p>
        ) : (
          <SearchResults
            sessions={otherSessionsResults}
            isLoading={otherSessionsState === SessionQueryState.Loading}
            onEndReached={otherSessionsLoadNextPage}
          />
        )}
      </div>
    </Layout>
  );
}
