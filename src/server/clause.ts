
export enum BinaryOperator {
  Equals = '=',
  NotEquals = '!=',
  GreaterThan = '>',
  GreaterThanOrEqualTo = '>=',
  LessThan = '<',
  LessthanOrEqualTo = '<=',
  In = 'IN',
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

export interface Filter<T, O extends BinaryOperator, K extends keyof T> {
  fieldName: K;
  operator: O;
  value: FilterValue<T[K], O>;
}

export interface AggregateClause<T, O extends AggregateOperator> {
  operator: O;
  clauses: Clause<T>[];
}

export type Clause<T> =
  Filter<T, any, any>
  | AggregateClause<T, any>;

export type FiltersClauseDsl<T> =
  { [key in keyof T]?: (
      FilterValue<T[key], BinaryOperator.Equals>
      | { [op in BinaryOperator]?: FilterValue<T[key], op> }
  ) };

export type ClauseDsl<T> = {
  'AND': ClauseDsl<T>[]
} | {
  'OR': ClauseDsl<T>[]
} | FiltersClauseDsl<T>

export function isFilter<T>(clause: Clause<T>): clause is Filter<T, any, any> {
  return Object.values(BinaryOperator).includes(clause.operator);
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

export function renderClause<T>(
  clause: Clause<T>,
  getFieldName: (fieldName: keyof T) => string = (fieldName) => `"${fieldName}"`
): [string, Record<string, any>] {

  let paramIndex = 0;
  function getParamName(fieldName: string): string {
    paramIndex += 1;
    return `param_${fieldName}_${paramIndex}`;
  }

  function renderClauseInner<T2>(clause: Clause<T2>): [string, Record<string, any>] {
    if (isFilter(clause)) {
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
