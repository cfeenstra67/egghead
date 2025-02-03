import initSqlJs from "../../../lib/sql-wasm.js";
import { DataSource } from "typeorm";
import { AbstractDBController } from '../../server/abstract-db-controller';
import { migrations } from "../../migrations";
import { entities } from "../../models";
import { SQLConnection } from "../../server/sql-primitives.js";
import { typeormAdapter } from "../../server/typeorm-adapter.js";

export class SqlJsDBController extends AbstractDBController {

  constructor(private database?: Uint8Array) {
    super();
  }

  protected async createConnection(): Promise<SQLConnection> {
    const SQL = await initSqlJs({ locateFile: (file: any) => file });

    const dataSource = new DataSource({
      type: "sqljs",
      driver: SQL,
      autoSave: false,
      migrations,
      migrationsRun: true,
      entities,
      database: this.database,
    });

    await dataSource.initialize();

    return typeormAdapter(dataSource);
  }
}
