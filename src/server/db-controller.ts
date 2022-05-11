// import initSqlJs from '@jlongster/sql.js';
import initSqlJs from '../../lib/sql-wasm.js';
import { SQLiteFS } from 'absurd-sql';
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';
import EventTarget from '@ungap/event-target';
import { DataSource } from 'typeorm';
import { migrations } from '../migrations';
import { entities } from '../models';

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

    SQL.FS.mkdir('/sql');
    SQL.FS.mount(sqlFS, {}, '/sql');

    const path = '/sql/db.sqlite';

    class PatchedDatabase extends SQL.Database {
      constructor() {
        super(path, { filename: true });
        this.exec('PRAGMA journal_mode=MEMORY; PRAGMA page_size=8192;');
      }
    }

    SQL.Database = PatchedDatabase;

    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn("Running without SharedArrayBuffer, this will hurt performance.");
      let stream = SQL.FS.open(path, 'a+');
      await stream.node.contents.readIfFallback();
      SQL.FS.close(stream);
    }

    this.dataSource = new DataSource({
      type: 'sqljs',
      driver: SQL,
      autoSave: false,
      migrations,
      migrationsRun: true,
      entities,
    });

    await this.dataSource.initialize();

    this.dbEvents.dispatchEvent(new CustomEvent('init'));
  }

  useDb<T>(func: (db: DataSource) => T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.dataSource !== undefined) {
        resolve(func(this.dataSource));
        return;
      }
      this.dbEvents.addEventListener(
        'init',
        () => {
          try {
            resolve(func(this.dataSource as DataSource));
          } catch (err) {
            reject(err);
          }
        },
        { once: true }
      );
      if (!this.initCalled) {
        this.initCalled = true;
        this.initializeDb();
      }
    });
  }

}
