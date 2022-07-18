import queryStringGrammar, {
  QueryStringSemantics,
} from "./query-string.ohm-bundle";

export const IndexToken = "__index__";

export enum UnaryOperator {
  Not = "NOT",
}

export enum BinaryOperator {
  Equals = "=",
  NotEquals = "!=",
  GreaterThan = ">",
  GreaterThanOrEqualTo = ">=",
  LessThan = "<",
  LessthanOrEqualTo = "<=",
  In = "IN",
  NotIn = "NOT IN",
  Match = "MATCH",
}

export enum AggregateOperator {
  And = "AND",
  Or = "OR",
}

export type FilterValue<
  T,
  O extends BinaryOperator
> = O extends BinaryOperator.In
  ? T[]
  : O extends BinaryOperator.Equals
  ? T | null
  : O extends BinaryOperator.NotEquals
  ? T | null
  : O extends BinaryOperator.Match
  ? string
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
  | Filter<T, BinaryOperator, Keys<T>>
  | Unary<T, UnaryOperator>
  | AggregateClause<T, AggregateOperator>;

export type FiltersClauseDsl<T> = {
  [key in Keys<T>]?:
    | FilterValue<key extends keyof T ? T[key] : string, BinaryOperator.Equals>
    | {
        [op in BinaryOperator]?: FilterValue<
          key extends keyof T ? T[key] : string,
          op
        >;
      };
};

export type ClauseDsl<T> =
  | {
      AND: ClauseDsl<T>[];
    }
  | {
      OR: ClauseDsl<T>[];
    }
  | {
      NOT: ClauseDsl<T>;
    }
  | FiltersClauseDsl<T>;

export function isFilter<T>(clause: Clause<T>): clause is Filter<T, BinaryOperator, Keys<T>> {
  return Object.values(BinaryOperator).includes(clause.operator as any);
}

export function isUnary<T>(clause: Clause<T>): clause is Unary<T, UnaryOperator> {
  return Object.values(UnaryOperator).includes(clause.operator as any);
}

export function isAggregate<T>(
  clause: Clause<T>
): clause is AggregateClause<T, AggregateOperator> {
  return Object.values(AggregateOperator).includes(clause.operator as any);
}

export function dslToClause<T>(dsl: ClauseDsl<T>): Clause<T> {
  if (dsl.hasOwnProperty("AND")) {
    const clauses = (dsl as any).AND.map(dslToClause);
    return { operator: AggregateOperator.And, clauses };
  }
  if (dsl.hasOwnProperty("OR")) {
    const clauses = (dsl as any).AND.map(dslToClause);
    return { operator: AggregateOperator.Or, clauses };
  }
  if (dsl.hasOwnProperty("NOT")) {
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
    } else if (value === null || typeof value !== "object") {
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
          value: value2 as any,
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
  paramStartIndex?: number;
}

export function renderClause<T>({
  clause,
  getFieldName = (fieldName) => `"${String(fieldName)}"`,
  paramStartIndex = 0,
}: RenderClauseArgs<T>): [string, Record<string, any>, number] {
  let paramIndex = paramStartIndex;
  function getParamName(fieldName: string): string {
    paramIndex += 1;
    return `param${fieldName}${paramIndex}`;
  }

  if (isFilter(clause)) {
    if (clause.operator === BinaryOperator.Equals && clause.value === null) {
      return [`${getFieldName(clause.fieldName)} IS NULL`, {}, paramIndex];
    }
    if (clause.operator === BinaryOperator.NotEquals && clause.value === null) {
      return [`${getFieldName(clause.fieldName)} IS NOT NULL`, {}, paramIndex];
    }

    const paramName = getParamName(clause.fieldName as string);
    if ([BinaryOperator.In, BinaryOperator.NotIn].includes(clause.operator)) {
      return [
        `${getFieldName(clause.fieldName)} ${
          clause.operator
        } (:...${paramName})`,
        { [paramName]: clause.value },
        paramIndex,
      ];
    }

    return [
      `${getFieldName(clause.fieldName)} ${clause.operator} :${paramName}`,
      { [paramName]: clause.value },
      paramIndex,
    ];
  }
  if (isUnary(clause)) {
    const [sql, params, newParamIndex] = renderClause({
      clause: clause.clause,
      paramStartIndex: paramIndex,
      getFieldName,
    });
    return [`NOT (${sql})`, params, newParamIndex];
  }

  if (clause.clauses.length === 0) {
    switch (clause.operator) {
      case AggregateOperator.And:
        return ['TRUE', {}, paramIndex];
      case AggregateOperator.Or:
        return ['FALSE', {}, paramIndex];
    }
  }

  const parts: string[] = [];
  const allParams: Record<string, any> = {};
  clause.clauses.forEach((subClause) => {
    const [sql, params, newParamIndex] = renderClause({
      clause: subClause,
      paramStartIndex: paramIndex,
      getFieldName,
    });
    paramIndex = newParamIndex;
    parts.push(sql);
    Object.assign(allParams, params);
  });
  const outSql = `(${parts.join(` ${clause.operator} `)})`;
  return [outSql, allParams, paramIndex];
}

export function clausesEqual<T>(
  clause1: Clause<T>,
  clause2: Clause<T>
): boolean {
  if (clause1.operator !== clause2.operator) {
    return false;
  }

  function compareValues(a: any, b: any): boolean {
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b)) {
        return false;
      }
      if (a.length !== b.length) {
        return false;
      }
      return a.every((item, idx) => compareValues(b[idx], item));
    }
    return a === b;
  }

  if (isFilter(clause1) && isFilter(clause2)) {
    return (
      clause1.fieldName === clause2.fieldName &&
      compareValues(clause1.value, clause2.value)
    );
  }

  if (isUnary(clause1) && isUnary(clause2)) {
    return clausesEqual(clause1.clause, clause2.clause);
  }
  const aggClause1 = clause1 as AggregateClause<any, any>;
  const aggClause2 = clause2 as AggregateClause<any, any>;
  if (aggClause1.clauses.length !== aggClause2.clauses.length) {
    return false;
  }
  return aggClause1.clauses.every((c1, idx) => {
    return clausesEqual(c1, aggClause2.clauses[idx]);
  });
}

export function getSearchString(inputString: string): string {
  return JSON.stringify(inputString).replace(/\\"/g, '""');
}

function addClauseOperation<T>(semantics: QueryStringSemantics): void {

  semantics.addOperation<Clause<T>>("clause", {
    NotQuery_not: (_, notQuery) => {
      return {
        operator: UnaryOperator.Not,
        clause: notQuery.clause(),
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
    rawTerm: (node) => {
      let value: any = node.sourceString;
      if (value === "null") {
        value = null;
      } else {
        value = getSearchString(value);
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
        value: getSearchString(value.sourceString.replace(/\\"/g, '"')),
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
          ge: BinaryOperator.GreaterThanOrEqualTo,
          le: BinaryOperator.LessthanOrEqualTo,
          eq: BinaryOperator.Equals,
          ne: BinaryOperator.NotEquals,
        }[op];
      }
      if (outOp === undefined) {
        outOp = BinaryOperator.Equals;
      }

      return {
        operator: outOp,
        fieldName: col.sourceString as Keys<T>,
        value: term,
      };
    },
    _iter: (...children) => {
      if (children.length === 1) {
        return children[0].clause();
      }
      return {
        operator: AggregateOperator.And,
        clauses: children.map((child) => child.clause()),
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

function factorUnaryClause<T>(clause: Unary<T, UnaryOperator>): Clause<T> {
  const factoredInner = factorClause(clause.clause);
  if (isUnary(factoredInner)) {
    return factoredInner.clause;
  }
  if (isFilter(factoredInner)) {
    return {
      operator: UnaryOperator.Not,
      clause: factoredInner,
    };
  }
  if (factoredInner.operator === AggregateOperator.And) {
    return {
      operator: AggregateOperator.Or,
      clauses: factoredInner.clauses.map((clause) => ({
        operator: UnaryOperator.Not,
        clause,
      })),
    }
  }
  return {
    operator: AggregateOperator.And,
    clauses: factoredInner.clauses.map((clause) => ({
      operator: UnaryOperator.Not,
      clause,
    })),
  }
}

// Source: https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
function* cartesianProduct<T>(head: T[], ...tail: T[][]): Generator<T[]> {
  const remainder = tail.length > 0 ? (
    cartesianProduct(tail[0], ...tail.slice(1)) 
  ) : [[]];
  for (const r of remainder) {
    for (const h of head) {
      yield [h, ...r];
    }
  }
}

function factorAggregateClause<T>(clause: AggregateClause<T, AggregateOperator>): Clause<T> {
  const factoredClauses = clause.clauses.map(factorClause);

  if (clause.operator === AggregateOperator.Or) {
    const subClauses: Clause<T>[] = [];
    for (const factoredClause of factoredClauses) {
      if (factoredClause.operator === AggregateOperator.Or) {
        for (const subClause of factoredClause.clauses) {
          subClauses.push(subClause);
        }
      } else {
        subClauses.push(factoredClause);
      }
    }
    return {
      operator: AggregateOperator.Or,
      clauses: subClauses,
    };
  }

  const orClauses: AggregateClause<T, AggregateOperator.Or>[] = [];
  const otherClauses: Clause<T>[] = [];

  for (const subClause of factoredClauses) {
    if (subClause.operator === AggregateOperator.Or) {
      orClauses.push(subClause as AggregateClause<T, AggregateOperator.Or>);
    } else if (subClause.operator === AggregateOperator.And) {
      for (const subSubClause of subClause.clauses) {
        otherClauses.push(subSubClause);
      }
    } else {
      otherClauses.push(subClause);
    }
  }

  if (orClauses.length === 0) {
    return {
      operator: AggregateOperator.And,
      clauses: otherClauses,
    };
  }

  const orClauseClauses = orClauses.map((clause) => clause.clauses);
  const results: Clause<T>[] = [];
  const combosGenerator = cartesianProduct(
    orClauseClauses[0],
    ...orClauseClauses.slice(1)
  );
  for (const combo of combosGenerator) {
    if (otherClauses.length === 0 && combo.length === 1) {
      results.push(combo[0]);
    } else {
      results.push({
        operator: AggregateOperator.And,
        clauses: otherClauses.concat(combo),
      });
    }
  }

  if (results.length === 1) {
    return results[0];
  }
  return {
    operator: AggregateOperator.Or,
    clauses: results,
  };
}

export function factorClause<T>(clause: Clause<T>): Clause<T> {
  if (isUnary(clause)) {
    return factorUnaryClause(clause);
  }
  if (isFilter(clause)) {
    return clause;
  }
  return factorAggregateClause(clause);
}

export function mapClauses<T>(
  clause: Clause<T>,
  func: (clause: Clause<T>) => Clause<T>
): Clause<T> {
  if (isUnary(clause)) {
    return func({
      operator: clause.operator,
      clause: mapClauses(clause.clause, func),
    });
  }
  if (isFilter(clause)) {
    return func(clause);
  }
  return func({
    operator: clause.operator,
    clauses: clause.clauses.map((c) => mapClauses(c, func))
  });
}
