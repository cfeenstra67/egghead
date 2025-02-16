import {
  type Compilable,
  type CompiledQuery,
  DummyDriver,
  type Generated,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely";
import type {
  Session,
  SessionIndex,
  SessionTermIndex,
  SessionTermIndexVocab,
  Settings,
} from "../models";

export type RemoveRelations<T> = {
  [key in keyof T as T[key] extends Promise<unknown>
    ? never
    : key]: key extends "id" ? Generated<T[key]> : T[key];
} & { rowid: Generated<number> };

export interface Database {
  session: RemoveRelations<Session>;
  session_index: RemoveRelations<SessionIndex>;
  session_term_index: RemoveRelations<SessionTermIndex>;
  session_term_index_vocab: RemoveRelations<SessionTermIndexVocab>;
  settings: RemoveRelations<Settings>;
}

export type QueryBuilder = Kysely<Database>;

export interface SQLConnection {
  <T>(query: string, parameters?: readonly unknown[]): Promise<T[]>;
  close: () => Promise<void>;
  export?: () => Promise<Uint8Array>;
  import?: (data: Uint8Array) => Promise<void>;
}

export function createQueryBuilder<D = Database>(): Kysely<D> {
  return new Kysely({
    dialect: {
      createAdapter() {
        return new SqliteAdapter();
      },
      createDriver() {
        return new DummyDriver();
      },
      createIntrospector(db: Kysely<unknown>) {
        return new SqliteIntrospector(db);
      },
      createQueryCompiler() {
        return new SqliteQueryCompiler();
      },
    },
  });
}

// type CompilationTarget = Compilable<CompiledQuery<{}>> & Expression<unknown>;

export type RemoveAnnotations<T> = {
  [key in keyof T]: T[key] extends Generated<infer I> ? I : T[key];
};

type OutputType<T extends Compilable<CompiledQuery<unknown>>> = ReturnType<
  T["compile"]
> extends CompiledQuery<infer O>
  ? RemoveAnnotations<O>
  : never;

export async function executeQuery<
  T extends Compilable<CompiledQuery<unknown>>,
>(expr: T, conn: SQLConnection): Promise<OutputType<T>[]> {
  const compiled = expr.compile();

  return await conn(compiled.sql, compiled.parameters);
}

// type OutputType<T extends Compilable<CompiledQuery<unknown>>> = ReturnType<T['compile']> extends CompiledQuery<infer O> ? O : never;

// type B = Compilable<CompiledQuery<{ a: number }>>;

// type C = OutputType2<B>;

// export async function executeStatement<T extends Compilable<CompiledQuery<unknown>>>(expr: T, conn: SQLConnection): Promise<OutputType2<T>[]> {
//   const compiled = expr.compile();

//   return await conn(compiled.sql, compiled.parameters);
// }

// const c = executeStatement({} as B, {} as any);

// const qb = createQueryBuilder();

// const q = qb.insertInto('session').defaultValues().returningAll();

// const r = executeStatement(q, {} as any)
