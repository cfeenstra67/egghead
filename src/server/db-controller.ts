// import initSqlJs from '@jlongster/sql.js';
import initSqlJs from "../../lib/sql-wasm.js";
import { SQLiteFS } from "absurd-sql";
import IndexedDBBackend from "absurd-sql/dist/indexeddb-backend";
import EventTarget from "@ungap/event-target";
import { DataSource } from "typeorm";
import { migrations } from "../migrations";
import { entities } from "../models";

export class DBController {
  initCalled: boolean;
  dataSource: DataSource | undefined;
  private dbEvents: EventTarget;

  constructor() {
    this.initCalled = false;
    this.dataSource = undefined;
    this.dbEvents = new EventTarget();
  }

  private async initializeDb() {
    const SQL = await initSqlJs({ locateFile: (file: any) => file });
    const sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend());
    SQL.register_for_idb(sqlFS);

    SQL.FS.mkdir("/sql");
    SQL.FS.mount(sqlFS, {}, "/sql");

    const path = "/sql/db.sqlite";

    class PatchedDatabase extends SQL.Database {
      constructor() {
        super(path, { filename: true });
        this.exec("PRAGMA journal_mode=MEMORY; PRAGMA page_size=8192;");
      }
    }

    SQL.Database = PatchedDatabase;

    if (typeof SharedArrayBuffer === "undefined") {
      console.warn(
        "Running without SharedArrayBuffer, this will hurt performance."
      );
      const stream = SQL.FS.open(path, "a+");
      await stream.node.contents.readIfFallback();
      SQL.FS.close(stream);
    }

    this.dataSource = new DataSource({
      type: "sqljs",
      driver: SQL,
      autoSave: false,
      migrations,
      migrationsRun: true,
      entities,
    });

    await this.dataSource.initialize();

    this.dbEvents.dispatchEvent(new CustomEvent("init"));
  }

  useDataSource(): Promise<DataSource> {
    return new Promise((resolve, reject) => {
      if (this.dataSource !== undefined) {
        resolve(this.dataSource);
        return;
      }

      const cleanUp = () => {
        this.dbEvents.removeEventListener("error", handleError);
        this.dbEvents.removeEventListener("init", handleInit);
      };

      const handleInit = (event: Event) => {
        resolve(this.dataSource as DataSource);
        cleanUp();
      };

      const handleError = (event: Event) => {
        reject((event as CustomEvent).detail);
        cleanUp();
      };

      this.dbEvents.addEventListener("init", handleInit);
      this.dbEvents.addEventListener("error", handleError);

      if (!this.initCalled) {
        this.initCalled = true;
        this.initializeDb().catch((err) => {
          this.dbEvents.dispatchEvent(
            new CustomEvent("error", { detail: err })
          );
          this.initCalled = false;
        });
      }
    });
  }

  // useDb<T>(func: (db: DataSource) => T): Promise<T> {
  //   return new Promise((resolve, reject) => {
  //     if (this.dataSource !== undefined) {
  //       resolve(func(this.dataSource));
  //       return;
  //     }
  //     this.dbEvents.addEventListener(
  //       'init',
  //       async () => {
  //         try {
  //           resolve(await func(this.dataSource as DataSource));
  //         } catch (err) {
  //           reject(err);
  //         }
  //       },
  //       { once: true }
  //     );
  //     if (!this.initCalled) {
  //       this.initCalled = true;
  //       this.initializeDb();
  //     }
  //   });
  // }
}
