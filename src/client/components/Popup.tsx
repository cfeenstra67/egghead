import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useContext, useState } from "react";
import type { Session } from "../../models";
import type { QuerySessionsRequest } from "../../server";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
} from "../../server/clause";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { AppContext } from "../lib/context";
import PopupLayout from "./PopupLayout";
import SearchResults from "./SearchResults";

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
      <div className="p-4 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="search"
            placeholder="Search history..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
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
        <div>
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
