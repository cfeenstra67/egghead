import type { Session } from "@/src/models";
import type { QuerySessionsRequest } from "@/src/server";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
  IndexToken,
} from "@/src/server/clause";
import { dateToSqliteString } from "@/src/server/utils";

export interface QueryFilters {
  query: string;
  selectedTerms: string[];
  selectedHosts: string[];
  dateStack: [Date, Date][];
}

export interface FiltersRequestOptions {
  omitHostFilter?: boolean;
}

export function filtersToRequest(
  filters: QueryFilters,
  opts?: FiltersRequestOptions,
): [QuerySessionsRequest, boolean] {
  const newRequest: QuerySessionsRequest = {
    query: filters.query,
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
  if (filters.selectedHosts.length > 0 && !opts?.omitHostFilter) {
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
  if (filters.dateStack.length > 0) {
    const [start, end] = filters.dateStack.at(-1)!;

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

  const isEmpty = clauses.length === 0 && !filters.query;

  return [newRequest, isEmpty];
}
