import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { BinaryOperator } from "../../server/clause";
import Layout from "../components/Layout";
import SearchResults from "../components/SearchResults";
import SessionCard from "../components/SessionCard";
import { AppContext } from "../lib";

export interface SessionDetailProps {
  sessionId: string;
}

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const { serverClientFactory } = useContext(AppContext);

  const pageSize = 200;

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const client = await serverClientFactory();
      return await client.querySessions({
        filter: {
          operator: BinaryOperator.Equals,
          fieldName: "id" as const,
          value: sessionId,
        },
      });
    },
  });

  const session = sessionQuery.data?.results[0];

  const parentSessions = useInfiniteQuery({
    queryKey: ["history", sessionId, "parents", session?.url],
    enabled: !!session,
    queryFn: async ({ pageParam }) => {
      const client = await serverClientFactory();
      return await client.querySessions({
        isSearch: true,
        childFilter: {
          operator: BinaryOperator.Equals,
          fieldName: "url",
          value: session!.url,
        },
        skip: pageParam,
        limit: pageSize,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage.results.length === 0) {
        return null;
      }
      return lastPageParam + pageSize;
    },
  });

  const sessionsQuery = useInfiniteQuery({
    queryKey: ["history", session?.url],
    enabled: !!session,
    queryFn: async ({ pageParam }) => {
      const client = await serverClientFactory();
      return await client.querySessions({
        isSearch: true,
        filter: {
          operator: BinaryOperator.Equals,
          fieldName: "url",
          value: session!.url,
        },
        skip: pageParam,
        limit: pageSize,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage.results.length === 0) {
        return null;
      }
      return lastPageParam + pageSize;
    },
  });

  return (
    <Layout>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden min-h-full p-4 max-w-[800px] mx-auto">
          <div className="rounded-xl border shadow p-6  flex flex-col gap-4 gap-y-6 mt-4">
            {session ? (
              <SessionCard session={session} />
            ) : sessionQuery.status === "pending" ? (
              <div>Loading session...</div>
            ) : sessionQuery.status === "error" ? (
              <div>Error loading session: {sessionQuery.error.message}.</div>
            ) : (
              <div>Session not found.</div>
            )}
            <div className="flex flex-col gap-4">
              {parentSessions.status === "error" ? (
                <p>An error occurred while loading source sessions.</p>
              ) : parentSessions.status === "success" &&
                parentSessions.data.pages[0].totalCount > 0 ? (
                <>
                  <h2 className="text-lg">Source sessions:</h2>
                  <SearchResults
                    showChildren="full"
                    showControls
                    aggregate
                    animate
                    sessions={parentSessions.data.pages.flatMap(
                      (page) => page.results,
                    )}
                    onEndReached={() => parentSessions.fetchNextPage()}
                  />
                </>
              ) : null}
            </div>
            <div className="flex flex-col gap-4">
              {sessionsQuery.status === "error" ? (
                <p>An error occurred while loading sessions.</p>
              ) : sessionsQuery.status === "success" &&
                sessionsQuery.data.pages[0].totalCount > 0 ? (
                <>
                  <h2 className="text-lg">Sessions:</h2>
                  <SearchResults
                    showChildren="full"
                    showControls
                    animate
                    sessions={sessionsQuery.data.pages.flatMap(
                      (page) => page.results,
                    )}
                    onEndReached={() => sessionsQuery.fetchNextPage()}
                  />
                </>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
