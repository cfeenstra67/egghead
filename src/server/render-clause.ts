import { type RawBuilder, sql } from "kysely";
import {
  AggregateOperator,
  BinaryOperator,
  type Clause,
  type Keys,
  isFilter,
  isUnary,
} from "./clause";

export interface RenderClauseArgs<T> {
  clause: Clause<T>;
  getFieldName?: (fieldName: Keys<T>) => string[];
}

export function renderClause<T>({
  clause,
  getFieldName = (fieldName) => [String(fieldName)],
}: RenderClauseArgs<T>): RawBuilder<boolean> {
  if (isFilter(clause)) {
    if (clause.operator === BinaryOperator.Equals && clause.value === null) {
      return sql`${sql.id(...getFieldName(clause.fieldName))} IS NULL`;
    }
    if (clause.operator === BinaryOperator.NotEquals && clause.value === null) {
      return sql`${sql.id(...getFieldName(clause.fieldName))} IS NOT NULL`;
    }

    if ([BinaryOperator.In, BinaryOperator.NotIn].includes(clause.operator)) {
      return sql`${sql.id(...getFieldName(clause.fieldName))} ${sql.raw(clause.operator)} (${sql.join(clause.value as any[])})`;
    }

    return sql`${sql.id(...getFieldName(clause.fieldName))} ${sql.raw(clause.operator)} ${clause.value}`;
  }
  if (isUnary(clause)) {
    const inner = renderClause({
      clause: clause.clause,
      getFieldName,
    });

    return sql`NOT (${inner})`;
  }

  if (clause.clauses.length === 0) {
    switch (clause.operator) {
      case AggregateOperator.And:
        return sql.lit(true);
      case AggregateOperator.Or:
        return sql.lit(false);
    }
  }

  const parts = clause.clauses.map((subClause) => {
    return renderClause({
      clause: subClause,
      getFieldName,
    });
  });

  const final = parts.reduce(
    (a, b) => sql<boolean>`${a} ${sql.raw(clause.operator)} ${b}`,
  );

  return sql`(${final})`;
}
