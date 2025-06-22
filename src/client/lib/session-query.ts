import debounce from "lodash/debounce";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import parentLogger from "../../logger.js";
import type { QuerySessionsRequest, SessionResponse } from "../../server";
import { Aborted } from "../../server/abort.js";
import { requestsEqual } from "../../server/utils.js";
import { AppContext } from "./context.js";

const logger = parentLogger.child({ context: "session-query" });

export enum SessionQueryState {
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
}

export interface SessionQuery {
  request: QuerySessionsRequest;
  initialLoadComplete: boolean;
  state: SessionQueryState;
  error?: string;
  results: SessionResponse[];
  loadNextPage: () => void;
}

export interface SessionQueryInterfaceArgs {
  getRequest: (abort: AbortSignal) => Promise<QuerySessionsRequest>;
  onChange?: (request: QuerySessionsRequest) => void;
  debounceDelay?: number;
  pageSize?: number;
}

export function useSessionQuery({
  getRequest,
  onChange,
  debounceDelay,
  pageSize,
}: SessionQueryInterfaceArgs): SessionQuery {
  if (debounceDelay === undefined) {
    debounceDelay = 150;
  }
  if (pageSize === undefined) {
    pageSize = 200;
  }

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [currentState, setCurrentState] = useState<SessionQueryState>(
    SessionQueryState.Loading,
  );
  const [results, setResults] = useState<SessionResponse[]>([]);
  const [currentRequest, setCurrentRequest] =
    useState<QuerySessionsRequest | null>(null);
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | undefined>(undefined);

  const { serverClientFactory } = useContext(AppContext);

  useEffect(() => {
    const abortController = new AbortController();

    async function load() {
      try {
        const newRequest = await getRequest(abortController.signal);
        if (
          !abortController.signal.aborted &&
          (currentRequest === null ||
            !requestsEqual(newRequest, currentRequest))
        ) {
          setCurrentRequest(newRequest);
          setInitialLoadComplete(false);
          onChange?.(newRequest);
        }
      } catch (error: any) {
        if (error instanceof Aborted) {
          return;
        }
        throw error;
      }
    }

    load();
    return () => abortController.abort();
  }, [currentRequest, getRequest]);

  const querySessions = useMemo(() => {
    return debounce(
      (
        request: QuerySessionsRequest,
        callback?: () => void,
        existingResults?: SessionResponse[],
      ) => {
        setCurrentState(SessionQueryState.Loading);
        setError(undefined);
        serverClientFactory()
          .then(async (client) => {
            const response = await client.querySessions(request);

            if (!request.abort?.aborted) {
              setCurrentState(SessionQueryState.Loaded);
              setResults((existingResults ?? []).concat(response.results));
              setCount(response.totalCount);
            }
          })
          .catch((err) => {
            if (err instanceof Aborted) {
              return;
            }
            logger.trace(
              `Error running request ${JSON.stringify(request)}`,
              err,
            );
            setCurrentState(SessionQueryState.Error);
            setError(err.toString());
          })
          .finally(() => {
            if (!request.abort?.aborted) {
              callback?.();
            }
          });
      },
      debounceDelay,
    );
  }, [debounceDelay, serverClientFactory]);

  useMemo(() => {
    if (currentRequest === null) {
      return;
    }

    const abortController = new AbortController();

    querySessions(
      {
        ...currentRequest,
        limit: pageSize,
        abort: abortController.signal,
      },
      () => {
        setInitialLoadComplete(true);
      },
    );

    return () => abortController.abort();
  }, [querySessions, currentRequest, pageSize]);

  const loadNextPage = useCallback(() => {
    if (results.length >= count || currentRequest === null) {
      return;
    }
    const abortController = new AbortController();
    querySessions(
      {
        ...currentRequest,
        limit: pageSize,
        skip: results.length,
        abort: abortController.signal,
      },
      undefined,
      results,
    );

    return () => abortController.abort();
  }, [results, count, currentRequest, querySessions, pageSize]);

  return {
    request: currentRequest ?? {},
    initialLoadComplete,
    state: currentState,
    error,
    results,
    loadNextPage,
  };
}
