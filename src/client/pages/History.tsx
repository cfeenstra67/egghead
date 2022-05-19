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
import { AppContext } from '../lib';
import { SessionResponse, QuerySessionsRequest } from '../../server';

export default function History() {
  const { serverClientFactory, query } = useContext(AppContext);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [results, setResults] = useState<SessionResponse[]>([]);
  const [count, setCount] = useState<number>(0);

  const debounceDelay = 150;
  const pageSize = 200;

  const querySessions = useMemo(() => {
    return _.debounce((
      request: Omit<QuerySessionsRequest, 'type'>,
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
    let active = true;
    const isActive = () => active;

    document.querySelector('#body > div')?.scroll(0, 0);
    querySessions(
      { query, limit: pageSize },
      undefined,
      isActive,
    );

    return () => { active = false; };
  }, [query, querySessions]);

  function onEndReached() {
    if (results.length >= count) {
      return;
    }
    querySessions(
      { query, skip: results.length, limit: pageSize },
      results,
    );
  }

  return (
    <Layout>
      <h1>History</h1>
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
