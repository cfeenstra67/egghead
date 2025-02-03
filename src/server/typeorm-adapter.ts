import { DataSource, QueryRunner } from "typeorm";
import { SQLConnection } from "./sql-primitives";

export function typeormAdapter(dataSource: DataSource): SQLConnection {
  const res = ((query, params) => dataSource.query(query, params as any[])) as SQLConnection;
  res.close = async () => { await dataSource.destroy() };

  return res;
}

export function typeormRunnerAdapter(runner: QueryRunner): SQLConnection {
  const res = ((query, params) => runner.query(query, params as any[])) as SQLConnection;
  res.close = async () => {};

  return res;
}
