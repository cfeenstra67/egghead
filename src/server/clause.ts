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
  NotIn = 'NOT IN',
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

export function isAggregate<T>(clause: Clause<T>): clause is AggregateClause<T, any> {
  return Object.values(AggregateOperator).includes(clause.operator);
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

// export function invertClause<T>(clause: Clause<T>): Clause<T> {
//   switch (clause.operator) {
//     case UnaryOperator.Not:
//       return clause.clause;
//     case BinaryOperator.Equals:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.NotEquals,
//         value: clause.value,
//       };
//     case BinaryOperator.NotEquals:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.Equals,
//         value: clause.value
//       };
//     case BinaryOperator.GreaterThan:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.LessthanOrEqualTo,
//         value: clause.value
//       };
//     case BinaryOperator.GreaterThanOrEqualTo:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.LessThan,
//         value: clause.value
//       };
//     case BinaryOperator.LessThan:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.GreaterThanOrEqualTo,
//         value: clause.value
//       };
//     case BinaryOperator.LessthanOrEqualTo:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.GreaterThan,
//         value: clause.value
//       };
//     case BinaryOperator.In:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.NotIn,
//         value: clause.value
//       };
//     case BinaryOperator.NotIn:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.In,
//         value: clause.value
//       };
//     case BinaryOperator.Match:
//       return {
//         fieldName: clause.fieldName,
//         operator: BinaryOperator.Match,
//         value: `dum:dum NOT ${clause.value}`,
//       };
//     case AggregateOperator.And:
//       return {
//         operator: AggregateOperator.Or,
//         clauses: clause.clauses.map(invertClause),
//       };
//     case AggregateOperator.Or:
//       return {
//         operator: AggregateOperator.And,
//         clauses: clause.clauses.map(invertClause),
//       };
//   }
// }

export interface RenderClauseArgs<T> {
  clause: Clause<T>;
  getFieldName?: (fieldName: Keys<T>) => string;
  getFilter?: (filter: Filter<any, any, any>) => Filter<any, any, any>;
  paramStartIndex?: number;
}

export function renderClause<T>({
  clause,
  getFieldName = (fieldName) => `"${fieldName}"`,
  getFilter = (filter) => filter,
  paramStartIndex = 0,
}: RenderClauseArgs<T>): [string, Record<string, any>, number] {

  let paramIndex = paramStartIndex;
  function getParamName(fieldName: string): string {
    paramIndex += 1;
    return `param_${fieldName}_${paramIndex}`;
  }

  if (isFilter(clause)) {
    clause = getFilter(clause);
    if (clause.operator === BinaryOperator.Equals && clause.value === null) {
      return [
        `${getFieldName(clause.fieldName)} IS NULL`,
        {},
        paramIndex,
      ];
    }
    if (clause.operator === BinaryOperator.NotEquals && clause.value === null) {
      return [
        `${getFieldName(clause.fieldName)} IS NOT NULL`,
        {},
        paramIndex,
      ];
    }

    const paramName = getParamName(clause.fieldName);
    if ([BinaryOperator.In, BinaryOperator.NotIn].includes(clause.operator)) {
      return [
        `${getFieldName(clause.fieldName)} ${clause.operator} (:...${paramName})`,
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
    let innerClause = clause.clause;
    if (isFilter(innerClause)) {
      innerClause = getFilter(innerClause);
    }

    const [sql, params, newParamIndex] = renderClause({
      clause: clause.clause,
      paramStartIndex: paramIndex,
      getFieldName,
      getFilter,
    });
    return [`NOT (${sql})`, params, newParamIndex];
  }

  const parts: string[] = [];
  const allParams: Record<string, any> = {};
  clause.clauses.forEach((subClause) => {
    const [sql, params, newParamIndex] = renderClause({
      clause: subClause,
      paramStartIndex: paramIndex,
      getFieldName,
      getFilter,
    });
    paramIndex = newParamIndex;
    parts.push(isFilter(subClause) ? sql : `(${sql})`);
    Object.assign(allParams, params);
  })
  const outSql = parts.join(` ${clause.operator} `);
  return [outSql, allParams, paramIndex];
}

export function clausesEqual<T>(clause1: Clause<T>, clause2: Clause<T>): boolean {
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

function addClauseOperation<T>(semantics: QueryStringSemantics): void {
  semantics.addOperation<Clause<T>>('clause', {
    Query: (queries) => {
      return {
        operator: AggregateOperator.And,
        clauses: queries.children.map((child) => child.clause())
      };
    },
    // TODO: this is not really complete, everything in NOT gets passed
    // directly into the full text search engine
    NotQuery_not: (_, notQuery) => {
      return {
        operator: BinaryOperator.Match,
        fieldName: IndexToken,
        value: [
          'dum:dum',
          'NOT',
          JSON.stringify(notQuery.sourceString),
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
