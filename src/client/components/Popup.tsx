import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useContext, useState } from "react";
import type { Session } from "../../models";
import type { QuerySessionsRequest } from "../../server";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
} from "../../server/clause";
import { AppContext } from "../lib/context";
import PopupLayout from "./PopupLayout";
import SearchResults from "./SearchResults";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

export default function Popup() {
  const { query, setQuery, runtime, serverClientFactory } =
    useContext(AppContext);
  const [currentDomainOnly, setCurrentDomainOnly] = useState(false);

  const pageSize = 200;

  const sessionsQuery = useInfiniteQuery({
    queryKey: ["history", query, currentDomainOnly],
    queryFn: async ({ pageParam }) => {
      const newRequest: QuerySessionsRequest = {
        query,
        isSearch: true,
      };

      const clauses: Clause<Session>[] = [];

      if (currentDomainOnly) {
        const currentUrl = await runtime.getCurrentUrl();
        clauses.push({
          operator: BinaryOperator.Equals,
          fieldName: "host",
          value: new URL(currentUrl).hostname,
        });
      }

      if (clauses.length === 1) {
        newRequest.filter = clauses[0];
      } else if (clauses.length > 1) {
        newRequest.filter = {
          operator: AggregateOperator.And,
          clauses,
        };
      }

      const client = await serverClientFactory();
      return await client.querySessions({
        ...newRequest,
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
    <PopupLayout>
      <div className="flex flex-col overflow-hidden h-full">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search history..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <X
                className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground cursor-pointer"
                onClick={() => setQuery("")}
              />
            ) : null}
          </div>
        </div>
        <div className="flex gap-2 p-2">
          <Badge
            className="cursor-pointer"
            variant="outline"
            onClick={() => runtime.openHistory()}
          >
            Open History
          </Badge>
          <Badge
            className="cursor-pointer"
            onClick={() => setCurrentDomainOnly(!currentDomainOnly)}
            variant={currentDomainOnly ? "default" : "outline"}
          >
            Current Domain Only
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto pt-[1px]">
          {sessionsQuery.status === "error" ? (
            <p>An error occurred while loading search results.</p>
          ) : (
            <SearchResults
              showChildren="short"
              showControls
              aggregate
              animate
              sessions={
                sessionsQuery.data?.pages.flatMap((p) => p.results) ?? []
              }
              isLoading={sessionsQuery.status === "pending"}
              onEndReached={() => sessionsQuery.fetchNextPage()}
            />
          )}
        </div>
      </div>
    </PopupLayout>
  );
}
