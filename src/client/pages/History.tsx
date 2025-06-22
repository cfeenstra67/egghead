import { useInfiniteQuery } from "@tanstack/react-query";
import { RotateCcw, Square, SquareCheck, Trash2, X } from "lucide-react";
import { useContext, useState } from "react";
import type { Session } from "../../models";
import type { DeleteSessionsRequest } from "../../server";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
} from "../../server/clause.js";
import { DeleteSessionModal } from "../components/DeleteSessionModal.js";
import Layout from "../components/Layout.js";
import SearchHelp from "../components/SearchHelp.js";
import SearchResults from "../components/SearchResults.js";
import SearchResultsSideBar from "../components/SearchResultsSideBar.js";
import Timeline from "../components/Timeline.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip.js";
import { useDebounced } from "../hooks/use-debounced.js";
import { AppContext } from "../lib";
import { type QueryFilters, filtersToRequest } from "../lib/filters.js";

type NonQueryFilters = Omit<QueryFilters, "query">;

interface ChecksState {
  defaultChecked: boolean;
  differentIds: string[];
}

const defaultChecksState: ChecksState = {
  defaultChecked: true,
  differentIds: [],
};

const defaultFilters: NonQueryFilters = {
  selectedTerms: [],
  selectedHosts: [],
  dateStack: [],
};

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface ControlsProps {
  numTotal: number;
  numSelected: number;
  checksState: ChecksState | null;
  setChecksState: Setter<ChecksState | null>;
  setDeleteOpen: Setter<boolean>;
  setFilters: Setter<NonQueryFilters>;
  setQuery: (query: string) => void;
  emptyFilters: boolean;
}

function Controls({
  numTotal,
  numSelected,
  checksState,
  setChecksState,
  setDeleteOpen,
  setFilters,
  setQuery,
  emptyFilters,
}: ControlsProps) {
  const [searchHelpOpen, setSearchHelpOpen] = useState(false);

  return (
    <>
      <SearchHelp open={searchHelpOpen} onOpenChanged={setSearchHelpOpen} />
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-end">
          <h1 className="text-2xl font-semibold">Activity</h1>
          {numTotal > 0 ? (
            <div className="font-semibold text-sm text-muted-foreground pb-1">
              {numTotal} result{numTotal === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>

        {checksState !== null ? (
          <>
            {numSelected > 0 ? (
              <div className="text-sm font-semibold">
                {numSelected} item{numSelected === 1 ? "" : "s"} selected
              </div>
            ) : null}
            <div className="flex gap-2 items-center">
              {checksState?.defaultChecked === true &&
              checksState?.differentIds.length === 0 ? (
                <Button
                  onClick={() =>
                    setChecksState({
                      defaultChecked: false,
                      differentIds: [],
                    })
                  }
                >
                  <Square />
                  {"Deselect all"}
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setChecksState({
                      defaultChecked: true,
                      differentIds: [],
                    })
                  }
                >
                  <SquareCheck />
                  {"Select all"}
                </Button>
              )}
              <Button
                variant="destructive"
                disabled={numSelected === 0}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setChecksState(null)}>
                <X />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              className="underline"
              onClick={() => setSearchHelpOpen(true)}
            >
              Search help
            </Button>

            {!emptyFilters ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-2"
                    onClick={() => {
                      setFilters(defaultFilters);
                      setQuery("");
                    }}
                  >
                    <RotateCcw className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Filters</TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setChecksState(defaultChecksState)}
                  className="px-2"
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete items</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </>
  );
}

function dateRangeToLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => {
    return d.toLocaleString("en-US", {
      day: "numeric",
      hour: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const endWithBump = new Date(end.getTime() + 1000);
  return `${fmt(start)} - ${fmt(endWithBump)}`;
}

export default function History() {
  const { query, setQuery, serverClientFactory } = useContext(AppContext);
  const [checksState, setChecksState] = useState<ChecksState | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const debouncedQuery = useDebounced(query, 500);
  const [filters, setFilters] = useState<NonQueryFilters>(defaultFilters);

  const allFilters: QueryFilters = {
    ...filters,
    query: debouncedQuery,
  };

  const [newRequest, requestEmpty] = filtersToRequest(allFilters);

  const pageSize = 200;

  const response = useInfiniteQuery({
    queryKey: ["history", newRequest],
    queryFn: async ({ pageParam }) => {
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

  if (response.error) {
    console.error(response.error);
  }

  let numSelected = 0;
  if (checksState !== null) {
    if (checksState.defaultChecked && response.status === "success") {
      const total = response.data.pages[0].totalCount;
      numSelected = total - checksState.differentIds.length;
    } else if (!checksState.defaultChecked) {
      numSelected = checksState.differentIds.length;
    }
  }

  let deleteRequest: DeleteSessionsRequest | null = null;
  if (checksState !== null) {
    if (!checksState.defaultChecked) {
      deleteRequest = {
        filter: {
          operator: BinaryOperator.In,
          fieldName: "id",
          value: checksState.differentIds,
        },
      };
    } else if (checksState.differentIds.length === 0) {
      deleteRequest = newRequest;
    } else {
      const deleteClauses: Clause<Session>[] = [
        {
          operator: BinaryOperator.NotIn,
          fieldName: "id",
          value: checksState.differentIds,
        },
      ];
      if (newRequest.filter) {
        deleteClauses.push(newRequest.filter);
      }
      const final: Clause<Session> =
        deleteClauses.length === 1
          ? deleteClauses[0]
          : {
              operator: AggregateOperator.And,
              clauses: deleteClauses,
            };
      deleteRequest = {
        query: newRequest.query,
        filter: final,
      };
    }
  }

  return (
    <Layout autoFocus searchDisabled={!!checksState}>
      {deleteRequest !== null ? (
        <DeleteSessionModal
          request={deleteRequest}
          open={deleteOpen}
          onOpenChanged={(open) => setDeleteOpen(open)}
          onDelete={() => {
            setChecksState(null);
            setDeleteOpen(false);
          }}
        />
      ) : null}
      <SearchResultsSideBar
        className="hidden md:block"
        disabled={!!checksState}
        filters={allFilters}
        setSelectedHosts={(selectedHosts) =>
          setFilters((f) => ({ ...f, selectedHosts }))
        }
        setSelectedTerms={(selectedTerms) =>
          setFilters((f) => ({ ...f, selectedTerms }))
        }
      />
      <main className="flex-1 overflow-y-scroll">
        <div className="flex flex-col gap-4 p-4">
          <Controls
            numTotal={response.data?.pages[0]?.totalCount ?? 0}
            numSelected={numSelected}
            checksState={checksState}
            setChecksState={setChecksState}
            setDeleteOpen={setDeleteOpen}
            emptyFilters={requestEmpty}
            setFilters={setFilters}
            setQuery={setQuery}
          />
          <div className="flex gap-2 flex-wrap max-w-full overflow-hidden">
            {query ? (
              <Badge
                className="cursor-pointer truncate gap-2"
                onClick={() => setQuery("")}
              >
                <span className="truncate">Search: {query}</span>
                <X className="w-4 h-4 shrink-0" />
              </Badge>
            ) : null}
            {filters.dateStack.length > 0 ? (
              <Badge
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    dateStack: f.dateStack.slice(0, -1),
                  }))
                }
                className="cursor-pointer"
              >
                Time: {dateRangeToLabel(...filters.dateStack.at(-1)!)}
                <X className="w-4 h-4 ml-2" />
              </Badge>
            ) : null}
            {filters.selectedHosts.map((host) => (
              <Badge
                key={host}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    selectedHosts: f.selectedHosts.filter((h) => h !== host),
                  }))
                }
                className="cursor-pointer"
              >
                Host: {host}
                <X className="w-4 h-4 ml-2" />
              </Badge>
            ))}
            {filters.selectedTerms.map((term) => (
              <Badge
                key={term}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    selectedTerms: f.selectedTerms.filter((t) => t !== term),
                  }))
                }
                className="cursor-pointer"
              >
                Term: {term}
                <X className="w-4 h-4 ml-2" />
              </Badge>
            ))}
          </div>
          <div>
            <Timeline
              request={newRequest}
              dateRange={filters.dateStack.at(-1) ?? null}
              setDateRange={(dateRange) =>
                setFilters((f) => ({
                  ...f,
                  dateStack: f.dateStack.concat([dateRange]),
                }))
              }
            />
          </div>
        </div>

        {response.status === "error" ? (
          <p>An error occurred while loading search results.</p>
        ) : (
          <SearchResults
            animate
            showChildren="full"
            showControls
            aggregate
            showChecks={!!checksState}
            checked={(id) => {
              const different = checksState?.differentIds.includes(id);
              return different
                ? !checksState?.defaultChecked
                : !!checksState?.defaultChecked;
            }}
            setChecked={(ids, checked) => {
              const currentDifferent = ids.some((id) =>
                checksState?.differentIds.includes(id),
              );
              if (
                checked === checksState?.defaultChecked &&
                !currentDifferent
              ) {
                return;
              }
              if (checked === checksState?.defaultChecked) {
                setChecksState((state) => ({
                  ...(state ?? defaultChecksState),
                  differentIds:
                    state?.differentIds.filter(
                      (otherId) => !ids.includes(otherId),
                    ) ?? [],
                }));
                return;
              }
              if (currentDifferent) {
                return;
              }
              setChecksState((state) => ({
                ...(state ?? defaultChecksState),
                differentIds: (state?.differentIds ?? []).concat(ids),
              }));
            }}
            sessions={response.data?.pages.flatMap((p) => p.results) ?? []}
            isLoading={response.status === "pending"}
            onEndReached={() => response.fetchNextPage()}
            query={query}
          />
        )}
      </main>
    </Layout>
  );
}
