import sqlite3InitModule, { type Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { executeMigrations } from "../models/migrations";
import { AbstractDBController } from "./abstract-db-controller";
import type { SQLConnection } from "./sql-primitives";

export class SQLiteWASMDBController extends AbstractDBController {
  private sqlite3: Sqlite3Static | null = null;

  constructor(readonly path: string) {
    super();
  }

  protected async createConnection(): Promise<SQLConnection> {
    this.sqlite3 = await sqlite3InitModule({
      print: (msg) => console.log("SQLITE LOG", msg),
      printErr: (msg) => console.error("SQLITE ERROR", msg),
    });

    const db = new this.sqlite3.oo1.OpfsDb(this.path);

    const returnFunc = ((query, parameters) => {
      return new Promise((resolve, reject) => {
        try {
          const rows: any[] = [];

          const params: any[] = [];
          for (const p of parameters ?? []) {
            if (p instanceof Date) {
              params.push(p.toISOString());
            } else {
              params.push(p);
            }
          }

          db.exec({
            sql: query,
            bind: params,
            rowMode: "object",
            callback: (row) => {
              rows.push(row);
            },
          });
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      });
    }) as SQLConnection;

    returnFunc.close = async () => {
      db.close();
    };

    returnFunc.export = async () => {
      return this.sqlite3!.capi.sqlite3_js_db_export(db);
    };

    returnFunc.import = async (data) => {
      await this.sqlite3!.oo1.OpfsDb.importDb(this.path, data);
      await executeMigrations(returnFunc);
    };

    await executeMigrations(returnFunc);

    return returnFunc;
  }

  async reset(): Promise<void> {
    if (!this.sqlite3?.oo1.OpfsDb) {
      throw new Error("not implemented");
    }
    const dir = await navigator.storage.getDirectory();
    await dir.removeEntry(this.path);
    await this.teardownDb();
    await this.initializeDb();
  }
}
