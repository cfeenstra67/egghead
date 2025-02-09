import sqlite3InitModule, {
  type OpfsDatabase,
  type Sqlite3Static,
  type Database,
} from "@sqlite.org/sqlite-wasm";
import { executeDdl } from "../models/ddl";
import { AbstractDBController } from "./abstract-db-controller";
import type { SQLConnection } from "./sql-primitives";

type OPFSBackend = { type: "opfs"; path: string };

type InMemoryBackend = { type: "memory" };

type Backend = OPFSBackend | InMemoryBackend;

function loadInMemoryDb(
  sqlite3: Sqlite3Static,
  db: Database,
  array: Uint8Array,
): void {
  const p = sqlite3.wasm.allocFromTypedArray(array);
  const flags =
    sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
    sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE;
  const rc = sqlite3.capi.sqlite3_deserialize(
    db.pointer!,
    "main",
    p,
    array.byteLength,
    array.byteLength,
    flags,
  );
  db.checkRc(rc);
}

export class SQLiteWASMDBController extends AbstractDBController {
  private sqlite3: Sqlite3Static | null = null;

  constructor(readonly backend: Backend) {
    super();
  }

  protected async createConnection(): Promise<SQLConnection> {
    this.sqlite3 = await sqlite3InitModule({
      print: (msg) => console.log("SQLITE LOG", msg),
      printErr: (msg) => console.error("SQLITE ERROR", msg),
    });

    let db: OpfsDatabase;
    if (this.backend.type === "memory") {
      db = new this.sqlite3.oo1.DB({ filename: ":memory:" });
    } else {
      db = new this.sqlite3.oo1.OpfsDb(this.backend.path);
    }

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
      if (this.backend.type === "opfs") {
        await this.sqlite3!.oo1.OpfsDb.importDb(this.backend.path, data);
        return;
      }
      if (this.backend.type === "memory") {
        loadInMemoryDb(this.sqlite3!, db, data);
        return;
      }
      const _: never = this.backend;
      throw new Error("not implemented");
    };

    await executeDdl(returnFunc);

    return returnFunc;
  }

  async reset(): Promise<void> {
    if (this.backend.type !== "opfs") {
      throw new Error("not implemented");
    }
    const dir = await navigator.storage.getDirectory();
    await dir.removeEntry(this.backend.path);
    await this.teardownDb();
    await this.initializeDb();
  }
}
