import * as ohm from 'ohm-js';
import queryStringGrammar, {
  QueryStringSemantics
} from './query-string.ohm-bundle';

export const IndexToken = '__index__';

export enum UnaryOperator {
  Not = 'NOT',
}

export enum BinaryOperator {
  Equals = '=',
  NotEquals = '!=',
  GreaterThan = '>',
  GreaterThanOrEqualTo = '>=',
  LessThan = '<',
  LessthanOrEqualTo = '<=',
  In = 'IN',
  Match = 'MATCH',
}

export enum AggregateOperator {
  And = 'AND',
  Or = 'OR',
}

export type FilterValue<T, O extends BinaryOperator> =
  O extends BinaryOperator.In ? T[]
  : O extends BinaryOperator.Equals ? T | null
  : O extends BinaryOperator.NotEquals ? T | null
  : T;

type Keys<T> = keyof T | typeof IndexToken;

export interface Filter<T, O extends BinaryOperator, K extends Keys<T>> {
  fieldName: K;
  operator: O;
  value: FilterValue<K extends keyof T ? T[K] : string, O>;
}

export interface Unary<T, O extends UnaryOperator> {
  operator: O;
  clause: Clause<T>;
}

export interface AggregateClause<T, O extends AggregateOperator> {
  operator: O;
  clauses: Clause<T>[];
}

export type Clause<T> =
  | Filter<T, any, any>
  | Unary<T, any>
  | AggregateClause<T, any>;

export type FiltersClauseDsl<T> =
  { [key in Keys<T>]?: (
      FilterValue<key extends keyof T ? T[key] : string, BinaryOperator.Equals>
      | { [op in BinaryOperator]?: FilterValue<key extends keyof T ? T[key] : string, op> }
  ) };

export type ClauseDsl<T> = {
  'AND': ClauseDsl<T>[]
} | {
  'OR': ClauseDsl<T>[]
} | {
  'NOT': ClauseDsl<T>
} | FiltersClauseDsl<T>;

export function isFilter<T>(clause: Clause<T>): clause is Filter<T, any, any> {
  return Object.values(BinaryOperator).includes(clause.operator);
}

export function isUnary<T>(clause: Clause<T>): clause is Unary<T, any> {
  return Object.values(UnaryOperator).includes(clause.operator);
}

export function dslToClause<T>(dsl: ClauseDsl<T>): Clause<T> {
  if (dsl.hasOwnProperty('AND')) {
    const clauses = (dsl as any).AND.map(dslToClause);
    return { operator: AggregateOperator.And, clauses };
  }
  if (dsl.hasOwnProperty('OR')) {
    const clauses = (dsl as any).AND.map(dslToClause);
    return { operator: AggregateOperator.Or, clauses };
  }
  if (dsl.hasOwnProperty('NOT')) {
    const clause = dslToClause<T>((dsl as any).NOT);
    return { operator: UnaryOperator.Not, clause };
  }
  const filters: Filter<T, any, any>[] = [];
  Object.entries(dsl).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      filters.push({
        fieldName: key,
        operator: BinaryOperator.In,
        value,
      });
    } else if (value === null || typeof value !== 'object') {
      filters.push({
        fieldName: key,
        operator: BinaryOperator.Equals,
        value: value,
      });
    } else {
      Object.entries(value).forEach(([key2, value2]) => {
        filters.push({
          fieldName: key,
          operator: key2,
          value: value2 as any
        });
      });
    }
  });
  if (filters.length === 1) {
    return filters[0];
  }
  return {
    operator: AggregateOperator.And,
    clauses: filters,
  };
}

export interface RenderClauseArgs<T> {
  clause: Clause<T>;
  getFieldName?: (fieldName: Keys<T>) => string;
  getFilter?: (filter: Filter<any, any, any>) => Filter<any, any, any>;
}

export function renderClause<T>({
  clause,
  getFieldName = (fieldName) => `"${fieldName}"`,
  getFilter = (filter) => filter
}: RenderClauseArgs<T>): [string, Record<string, any>] {

  let paramIndex = 0;
  function getParamName(fieldName: string): string {
    paramIndex += 1;
    return `param_${fieldName}_${paramIndex}`;
  }

  function renderClauseInner<T2>(clause: Clause<T2>): [string, Record<string, any>] {
    if (isFilter(clause)) {
      clause = getFilter(clause);
      if (clause.operator === BinaryOperator.Equals && clause.value === null) {
        return [
          `${getFieldName(clause.fieldName)} IS NULL`,
          {},
        ];
      }
      if (clause.operator === BinaryOperator.NotEquals && clause.value === null) {
        return [
          `${getFieldName(clause.fieldName)} IS NOT NULL`,
          {},
        ];
      }

      const paramName = getParamName(clause.fieldName);
      return [
        `${getFieldName(clause.fieldName)} ${clause.operator} :${paramName}`,
        { [paramName]: clause.value },
      ];
    }
    if (isUnary(clause)) {
      let innerClause: Clause<T2> = clause.clause;
      if (isFilter(innerClause)) {
        innerClause = getFilter(innerClause);
      }

      const [sql, params] = renderClauseInner(clause.clause);
      return [`NOT (${sql})`, params];
    }

    const parts: string[] = [];
    const allParams: Record<string, any> = {};
    clause.clauses.forEach((subClause) => {
      const [sql, params] = renderClauseInner(subClause);
      parts.push(isFilter(subClause) ? sql : `(${sql})`);
      Object.assign(allParams, params);
    })
    const outSql = parts.join(` ${clause.operator} `);
    return [outSql, allParams];
  }

  return renderClauseInner(clause);
}

function addClauseOperation<T>(semantics: QueryStringSemantics): void {
  semantics.addOperation<Clause<T>>('clause', {
    Query: (queries) => {
      return {
        operator: AggregateOperator.And,
        clauses: queries.children.map((child) => child.clause())
      };
    },
    NotQuery_not: (notQuery, _, queryComp) => {
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: [
          JSON.stringify(notQuery.sourceString),
          'NOT',
          JSON.stringify(queryComp.sourceString),
        ].join(' ') as any,
      };
    },
    QueryComp_parentheses: (_1, query, _2) => {
      return query.clause();
    },
    AndQuery_and: (andQuery, _, orQuery) => {
      return {
        operator: AggregateOperator.And,
        clauses: [andQuery.clause(), orQuery.clause()],
      };
    },
    OrQuery_or: (orQuery, _, comp) => {
      return {
        operator: AggregateOperator.Or,
        clauses: [orQuery.clause(), comp.clause()],
      };
    },
    rawTerm: (term1, term2) => {
      let value: any = [term1.sourceString, term2.sourceString].join('');
      if (value === 'null') {
        value = null;
      } else {
        value = JSON.stringify(value.replace(/"/g, '""'));
      }
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value,
      };
    },
    stringLiteral: (_1, value, _2) => {
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: JSON.stringify(value.sourceString.replace(/\\"/g, '""')) as any,
      };
    },
    columnQuery: (col, _1, operator, _2, value) => {
      let term = value.clause().value;
      term = term.slice(1, term.length - 1);

      let outOp: BinaryOperator | undefined = undefined;
      const op = operator.sourceString.slice(
        0,
        operator.sourceString.length - 1
      );
      if (op) {
        outOp = {
          gt: BinaryOperator.GreaterThan,
          lt: BinaryOperator.LessThan,
          gte: BinaryOperator.GreaterThanOrEqualTo,
          lte: BinaryOperator.LessthanOrEqualTo,
          eq: BinaryOperator.Equals,
          ne: BinaryOperator.NotEquals,
        }[op];
      }
      if (outOp === undefined) {
        outOp = BinaryOperator.Equals;
      }

      return {
        operator: outOp,
        fieldName: col.sourceString,
        value: term,
      };
    },
  });
}

const queryStringSemantics = queryStringGrammar.createSemantics();

addClauseOperation(queryStringSemantics);

export function parseQueryString<T>(queryString: string): Clause<T> {
  const match = queryStringGrammar.match(queryString);
  if (match.failed()) {
    throw new Error(`Unable to construct query for input: ${queryString}.`);
  }
  return queryStringSemantics(match).clause();
}
