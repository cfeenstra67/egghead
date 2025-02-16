import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { useContext, useState } from "react";
import type { Session } from "../../models";
import type { DeleteSessionsRequest, QuerySessionsRequest } from "../../server";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
  IndexToken,
} from "../../server/clause";
import { dateToSqliteString } from "../../server/utils";
import { DeleteSessionModal } from "../components/DeleteSessionModal";
import Layout from "../components/Layout";
import SearchResults from "../components/SearchResults";
import SearchResultsSideBar from "../components/SearchResultsSideBar";
import Timeline from "../components/Timeline";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useDebounced } from "../hooks/use-debounced";
import { AppContext } from "../lib";

interface QueryFilters {
  selectedTerms: string[];
  selectedHosts: string[];
  dateRange: [Date, Date] | null;
}

interface ChecksState {
  defaultChecked: boolean;
  differentIds: string[];
}

const defaultChecksState: ChecksState = {
  defaultChecked: true,
  differentIds: [],
};

const defaultFilters: QueryFilters = {
  selectedTerms: [],
  selectedHosts: [],
  dateRange: null,
};

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface ControlsProps {
  numSelected: number;
  checksState: ChecksState | null;
  setChecksState: Setter<ChecksState | null>;
  setDeleteOpen: Setter<boolean>;
  setFilters: Setter<QueryFilters>;
  setQuery: (query: string) => void;
  clauses: Clause<Session>[];
  query: string;
}

function Controls({
  numSelected,
  checksState,
  setChecksState,
  setDeleteOpen,
  setFilters,
  setQuery,
  clauses,
  query,
}: ControlsProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <h1 className="text-2xl font-semibold">Activity</h1>

      {checksState !== null ? (
        <>
          {numSelected > 0 ? (
            <div className="text-sm font-semibold">
              {numSelected} session{numSelected === 1 ? "" : "s"} selected
            </div>
          ) : null}
          <div className="flex gap-2">
            {checksState?.defaultChecked === true &&
            checksState?.differentIds.length === 0 ? (
              <Button
                className="h-8"
                onClick={() =>
                  setChecksState({
                    defaultChecked: false,
                    differentIds: [],
                  })
                }
              >
                Deselect all
              </Button>
            ) : (
              <Button
                className="h-8"
                onClick={() =>
                  setChecksState({
                    defaultChecked: true,
                    differentIds: [],
                  })
                }
              >
                Select all
              </Button>
            )}
            <Button
              variant="destructive"
              className="h-8"
              disabled={numSelected === 0}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              className="h-8"
              onClick={() => setChecksState(null)}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              disabled={clauses.length === 0 && !query}
              className="cursor-pointer"
              onClick={() => {
                setFilters(defaultFilters);
                setQuery("");
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Reset filters</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setChecksState(defaultChecksState)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Sessions</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default function HistoryV2() {
  const { query, setQuery, serverClientFactory } = useContext(AppContext);
  const [checksState, setChecksState] = useState<ChecksState | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const debouncedQuery = useDebounced(query, 500);
  const [filters, setFilters] = useState<QueryFilters>(defaultFilters);

  const newRequest: QuerySessionsRequest = {
    query: debouncedQuery,
    isSearch: true,
  };
  const clauses: Clause<Session>[] = [];

  if (filters.selectedTerms.length > 0) {
    const subClauses = filters.selectedTerms.map((term) => ({
      fieldName: IndexToken as typeof IndexToken,
      operator: BinaryOperator.Match,
      value: term,
    }));
    clauses.push({
      operator: AggregateOperator.And,
      clauses: subClauses,
    });
  }
  if (filters.selectedHosts.length > 0) {
    const subClauses = filters.selectedHosts.map((host) => ({
      operator: BinaryOperator.Equals,
      fieldName: "host" as const,
      value: host,
    }));
    clauses.push({
      operator: AggregateOperator.Or,
      clauses: subClauses,
    });
  }
  if (filters.dateRange !== null) {
    const [start, end] = filters.dateRange;

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
    <Layout searchDisabled={!!checksState}>
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
        request={newRequest}
        selectedHosts={filters.selectedHosts}
        setSelectedHosts={(selectedHosts) =>
          setFilters((f) => ({ ...f, selectedHosts }))
        }
        selectedTerms={filters.selectedTerms}
        setSelectedTerms={(selectedTerms) =>
          setFilters((f) => ({ ...f, selectedTerms }))
        }
      />
      <main className="flex-1 overflow-y-auto">
        <div>
          <Controls
            numSelected={numSelected}
            checksState={checksState}
            setChecksState={setChecksState}
            setDeleteOpen={setDeleteOpen}
            clauses={clauses}
            query={query}
            setFilters={setFilters}
            setQuery={setQuery}
          />
          <div className="px-4 pb-4">
            <Timeline
              request={newRequest}
              dateRange={filters.dateRange}
              setDateRange={(dateRange) =>
                setFilters((f) => ({ ...f, dateRange }))
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
