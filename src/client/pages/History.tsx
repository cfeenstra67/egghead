import * as _ from 'lodash';
import {
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import Layout from '../components/Layout';
import SearchResults from '../components/SearchResults';
import SearchResultsSideBar from '../components/SearchResultsSideBar';
import { AppContext } from '../lib';
import { Session } from '../../models';
import { SessionResponse, QuerySessionsRequest } from '../../server';
import {
  Clause,
  AggregateOperator,
  BinaryOperator,
  IndexToken,
} from '../../server/clause';
import { requestsEqual } from '../../server/utils';

export default function History() {
  const { serverClientFactory, query } = useContext(AppContext);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [results, setResults] = useState<SessionResponse[]>([]);
  const [count, setCount] = useState<number>(0);
  const [request, setRequest] = useState<QuerySessionsRequest>({});
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);

  const debounceDelay = 150;
  const pageSize = 200;

  const querySessions = useMemo(() => {
    return _.debounce((
      request: QuerySessionsRequest,
      existingResults?: SessionResponse[],
      isActive?: () => boolean,
    ) => {
      setLoading(true);
      serverClientFactory().then(async (client) => {
        const response = await client.querySessions(request);

        if (isActive && !isActive()) {
          return;
        }
        setResults((existingResults || []).concat(response.results));
        setCount(response.totalCount);
        setError(false);
        setLoading(false);
      }).catch((err) => {
        console.trace(`Error querying "${query}"`, err);
        setError(true);
        setLoading(false);
      });
    }, debounceDelay);
  }, [setError, setResults, setLoading, setCount]);

  useEffect(() => {
    const newRequest: QuerySessionsRequest = {
      query,
      limit: pageSize
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
        fieldName: 'host',
        value: host,
      }));
      clauses.push({
        operator: AggregateOperator.Or,
        clauses: subClauses,
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
      setRequest(newRequest);
    }
  }, [query, selectedTerms, selectedHosts, request, setRequest]);

  useEffect(() => {
    let active = true;
    const isActive = () => active;

    window.scroll(0, 0);
    querySessions(request, undefined, isActive);

    return () => { active = false };
  }, [querySessions, request]);

  const onEndReached = useCallback(() => {
    if (results.length >= count) {
      return;
    }
    querySessions(
      { ...request, limit: pageSize },
      results,
    );
  }, [results, count, request, querySessions]);

  return (
    <Layout>
      <h1>History</h1>
      <SearchResultsSideBar
        request={request}
        selectedHosts={selectedHosts}
        setSelectedHosts={setSelectedHosts}
        selectedTerms={selectedTerms}
        setSelectedTerms={setSelectedTerms}
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
