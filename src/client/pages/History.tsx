import { useCallback, useContext, useState } from "react";
import type { Session } from "../../models";
import type { QuerySessionsRequest } from "../../server";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
  IndexToken,
} from "../../server/clause";
import { dateToSqliteString } from "../../server/utils";
import Layout from "../components/Layout";
import SearchResults from "../components/SearchResults";
import SearchResultsSideBar from "../components/SearchResultsSideBar";
import Timeline from "../components/Timeline";
import { AppContext } from "../lib";
import { SessionQueryState, useSessionQuery } from "../lib/session-query";

export default function History() {
  const { query } = useContext(AppContext);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const getRequest = useCallback(async () => {
    const newRequest: QuerySessionsRequest = {
      query,
      isSearch: true,
    };
    const clauses: Clause<Session>[] = [];

    if (selectedTerms.length > 0) {
      const subClauses = selectedTerms.map((term) => ({
        fieldName: IndexToken as typeof IndexToken,
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
        fieldName: "host" as const,
        value: host,
      }));
      clauses.push({
        operator: AggregateOperator.Or,
        clauses: subClauses,
      });
    }
    if (dateRange !== null) {
      const [start, end] = dateRange;
      console.log("RANGE", {
        start: [start, dateToSqliteString(start)],
        end: [start, dateToSqliteString(end)],
      });

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
  }, [query, selectedTerms, selectedHosts, dateRange]);

  const { request, results, state, initialLoadComplete, loadNextPage } =
    useSessionQuery({
      onChange: () => {
        window.scroll(0, 0);
        setTimelineLoading(true);
        setSidebarLoading(true);
      },
      getRequest,
    });

  return (
    <Layout>
      <h1>History</h1>
      <SearchResultsSideBar
        ready={initialLoadComplete && !timelineLoading}
        loading={sidebarLoading}
        onLoadComplete={() => setSidebarLoading(false)}
        request={request}
        selectedHosts={selectedHosts}
        setSelectedHosts={setSelectedHosts}
        selectedTerms={selectedTerms}
        setSelectedTerms={setSelectedTerms}
      />
      <Timeline
        ready={initialLoadComplete}
        onLoadComplete={() => setTimelineLoading(false)}
        request={request}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      {state === SessionQueryState.Error ? (
        <p>An error occurred while loading search results.</p>
      ) : (
        <SearchResults
          sessions={results}
          isLoading={state === SessionQueryState.Loading}
          onEndReached={loadNextPage}
          query={query}
        />
      )}
    </Layout>
  );
}
