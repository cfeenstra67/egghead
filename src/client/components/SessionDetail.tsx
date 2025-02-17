import { BinaryOperator } from "@/src/server/clause";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { AppContext } from "../lib";
import SearchResults from "./SearchResults";
import SessionCard from "./SessionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export interface SessionDetailProps {
  sessionId: string;
  onDelete?: () => void;
}

export default function SessionDetail({
  sessionId,
  onDelete,
}: SessionDetailProps) {
  const { serverClientFactory } = useContext(AppContext);
  const [[tabValue, isDefault], setTabValue] = useState<[string, boolean]>([
    "parents",
    true,
  ]);

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
      // await new Promise<void>(() => {});
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

  const parentSessionsCount = parentSessions.data?.pages[0]?.totalCount ?? null;

  const sessionsQuery = useInfiniteQuery({
    queryKey: ["history", session?.url],
    enabled: !!session,
    queryFn: async ({ pageParam }) => {
      const client = await serverClientFactory();
      // await new Promise<void>(() => {});
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

  const sessionsCount = sessionsQuery.data?.pages[0]?.totalCount ?? null;

  if (
    sessionsCount !== null &&
    parentSessionsCount !== null &&
    isDefault &&
    parentSessionsCount === 0 &&
    sessionsCount > 0
  ) {
    setTabValue(["visits", false]);
  }

  return (
    <>
      {session ? (
        <SessionCard session={session} onDelete={onDelete} />
      ) : sessionQuery.status === "pending" ? (
        <div>Loading visit...</div>
      ) : sessionQuery.status === "error" ? (
        <div>Error loading visit: {sessionQuery.error.message}.</div>
      ) : (
        <div>Visit not found.</div>
      )}
      <Tabs
        value={tabValue}
        onValueChange={(value) => setTabValue([value, false])}
        className="flex-grow overflow-hidden flex flex-col"
      >
        <TabsList>
          <TabsTrigger value="parents">
            Navigated to this page from (
            {parentSessionsCount === null ? "..." : parentSessionsCount})
          </TabsTrigger>
          <TabsTrigger value="visits">
            Visits to this page (
            {sessionsCount === null ? "..." : sessionsCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="parents"
          className="flex-1 overflow-y-scroll overflow-x-hidden"
        >
          {parentSessions.status === "error" ? (
            <p>
              An error occurred while loading pages that we navigated to this
              one from.
            </p>
          ) : (
            <>
              <SearchResults
                showChildren="full"
                showControls
                aggregate
                animate
                isLoading={parentSessions.status === "pending"}
                sessions={
                  parentSessions.data?.pages.flatMap((page) => page.results) ??
                  []
                }
                onEndReached={() => parentSessions.fetchNextPage()}
              />
            </>
          )}
        </TabsContent>
        <TabsContent
          value="visits"
          className="flex-1 overflow-y-scroll overflow-x-hidden"
        >
          {sessionsQuery.status === "error" ? (
            <p>An error occurred while loading other visits to this page.</p>
          ) : (
            <>
              <SearchResults
                showChildren="full"
                showControls
                animate
                isLoading={sessionsQuery.status === "pending"}
                sessions={
                  sessionsQuery.data?.pages.flatMap((page) => page.results) ??
                  []
                }
                onEndReached={() => sessionsQuery.fetchNextPage()}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
