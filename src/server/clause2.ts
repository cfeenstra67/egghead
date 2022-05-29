// export namespace Clause {

//   export const IndexToken = '__index__';

//   export const And = '$and';

//   export const Or = '$or';

//   export const Not = '$not';

//   export const Equals = '$eq';

//   export const NotEquals = '$neq';

//   export const In = '$in';

//   export const NotIn = '$nin';

//   export const GreaterThan = '$gt';

//   export const GreaterThanOrEqualTo = '$gte';

//   export const LessThan = '$lt';

//   export const LessThanOrEqualTo = '$lte';

//   export type Operator =
//     | typeof Equals
//     | typeof NotEquals
//     | typeof In
//     | typeof NotIn
//     | typeof GreaterThan
//     | typeof GreaterThanOrEqualTo
//     | typeof LessThanOrEqualTo
//     | typeof LessThan;

//   export interface And<T> {
//     [And]: Clause<T>[];
//   }

//   export interface Or<T> {
//     [Or]: Clause<T>[];
//   }

//   export interface Not<T> {
//     [Not]: Clause<T>;
//   }

//   export type Keys<T> = keyof T | typeof IndexToken;

//   type SimpleValue<T> =
//     T extends any[] ? T[number]
//     : T;

//   export type Value<T, K extends Keys<T>> =
//     K extends typeof IndexToken ? string
//     : SimpleValue<T[K & keyof T]>;

//   export type FilterValueTypes<T, K extends Keys<T>> = {
//     [Equals]: Value<T, K> | null;
//     [NotEquals]: Value<T, K> | null;
//     [In]: Value<T, K>[];
//     [NotIn]: Value<T, K>[];
//     [GreaterThan]: Value<T, K>;
//     [LessThan]: Value<T, K>;
//     [LessThanOrEqualTo]: Value<T, K>;
//     [GreaterThan]: Value<T, K>;
//     [GreaterThanOrEqualTo]: Value<T, K>;
//   };

//   export type Filters<T> = {
//     [key in Keys<T>]?: FilterValueTypes<T, key>[typeof Equals] | (
//       { [op in Operator]?: FilterValueTypes<T, key>[op] }
//     )
//   };

//   export function isAnd<T>(clause: Clause<T>): clause is And<T> {
//     return (clause as And<T>)[And] !== undefined;
//   }

//   export function isOr<T>(clause: Clause<T>): clause is Or<T> {
//     return (clause as Or<T>)[Or] !== undefined;
//   }

//   export function isNot<T>(clause: Clause<T>): clause is Not<T> {
//     return (clause as Not<T>)[Not] !== undefined;
//   }

// }

// export type Clause<T> =
//   | Clause.And<T>
//   | Clause.Or<T>
//   | Clause.Not<T>
//   | Clause.Filters<T>
//   | boolean;

// export interface RenderClauseArgs<T> {
//   clause: Clause<T>;
//   getFieldName?: (fieldName: Clause.Keys<T>) => string;
//   getFilter?: <
//     K extends Clause.Keys<T>,
//     O extends Clause.Operator
//   >(
//     fieldName: K,
//     operator: O,
//     value: Clause.FilterValueTypes<T, K>[O]
//   ) => [Clause.Keys<T>, Clause.Operator, any];
// }

// export function renderClause<T>({
//   clause,
//   getFieldName = (fieldName) => `"${fieldName}"`,
//   getFilter = (field, op, value) => [field, op, value],
// }: RenderClauseArgs<T>): [string, Record<string, any>] {

//   let paramIndex = 0;
//   function getParamName(fieldName?: string): string {
//     paramIndex += 1;
//     if (fieldName === undefined) {
//       return `param_${paramIndex}`;
//     }
//     return `param_${fieldName}_${paramIndex}`;
//   }

//   function getOpString(op: Clause.Operator): string {
//     switch (op) {
//       case Clause.Equals:
//         return '=';
//       case Clause.NotEquals:
//         return '!=';
//       case Clause.In:
//         return 'IN';
//       case Clause.NotIn:
//         return 'NOT IN';
//       case Clause.GreaterThan:
//         return '>';
//       case Clause.GreaterThanOrEqualTo:
//         return '>=';
//       case Clause.LessThan:
//         return '<';
//       case Clause.LessThanOrEqualTo:
//         return '<=';
//     }
//   }

//   function renderFilter<K extends Clause.Keys<T>, O extends Clause.Operator>(
//     fieldName: K,
//     operator: O,
//     value: Clause.FilterValueTypes<T, K>[O],
//   ): [string, Record<string, any>] {
//     const [field, op, realValue] = getFilter(fieldName, operator, value);
//     if (op === Clause.Equals && realValue === null) {
//       return [`${getFieldName(field)} IS NULL`, {}];
//     }
//     if (op === Clause.NotEquals && realValue === null) {
//       return [`${getFieldName(field)} IS NOT NULL`, {}];
//     }
//     const paramName = getParamName(field as string);

//     return [
//       `${getFieldName(field)} ${getOpString(op)} :${paramName}`,
//       { [paramName]: realValue }
//     ];
//   }

//   function renderClauseInner(clause: Clause<T>): [string, Record<string, any>] {
//     if (typeof clause === 'boolean') {
//       const param = getParamName();
//       return [`:${param}`, { [param]: clause }];
//     }
//     if (Clause.isAnd(clause)) {
//       const comps: string[] = [];
//       const params: Record<string, any> = {};
//       clause[Clause.And].forEach((clause) => {
//         const [subSql, subParams] = renderClauseInner(clause);
//         comps.push(subSql);
//         Object.assign(params, subParams);
//       });
//       return [comps.map((comp) => `(${comp})`).join(' AND '), params];
//     }
//     if (Clause.isOr(clause)) {
//       const comps: string[] = [];
//       const params: Record<string, any> = {};
//       clause[Clause.Or].forEach((clause) => {
//         const [subSql, subParams] = renderClauseInner(clause);
//         comps.push(subSql);
//         Object.assign(params, subParams);
//       });
//       return [comps.map((comp) => `(${comp})`).join(' OR '), params];
//     }
//     if (Clause.isNot(clause)) {
//       const [sql, params] = renderClauseInner(clause[Clause.Not]);
//       return [`NOT (${sql})`, params];
//     }

//     const results = Object.entries(clause).flatMap(([fieldName, fieldValue]) => {
//       if (fieldValue === null) {
//         return [renderFilter(fieldName as Clause.Keys<T>, Clause.Equals, fieldValue)];
//       }
//       if (Array.isArray(fieldValue)) {
//         return [renderFilter(fieldName as Clause.Keys<T>, Clause.In, fieldValue)];
//       }
//       if (typeof fieldValue === 'object') {
//         return Object.entries(fieldValue).map(([operator, subValue]) => {
//           const name = fieldName as Clause.Keys<T>;
//           const op = operator as Clause.Operator;
//           const val = subValue as Clause.FilterValueTypes<T, typeof name>[typeof op];
//           return renderFilter(name, op, val);
//         });
//       }
//       return [renderFilter(fieldName as Clause.Keys<T>, Clause.Equals, fieldValue)];
//     });

//     const comps: string[] = [];
//     const params: Record<string, any> = {};

//     results.forEach(([sql, subParams]) => {
//       comps.push(sql);
//       Object.assign(params, subParams);
//     });

//     if (comps.length === 1) {
//       return [comps[0], params];
//     }
//     return [comps.map((comp) => `(${comp})`).join(' AND '), params];
//   }

//   return renderClauseInner(clause);
// }
