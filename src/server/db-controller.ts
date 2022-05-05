import initSqlJs from '@jlongster/sql.js';
import { SQLiteFS } from 'absurd-sql';
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';
import { EventTarget, Event } from 'event-target-shim';

export class DBController {

  initCalled: boolean;
  db: any;
  private dbEvents: EventTarget;

  constructor() {
    this.initCalled = false;
    this.db = undefined;
    this.dbEvents = new EventTarget();
  }

  private async initializeDb() {
    const SQL = await initSqlJs({ locateFile: (file: any) => file });
    const sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend());
    SQL.register_for_idb(sqlFS);

    SQL.FS.mkdir('/sql');
    SQL.FS.mount(sqlFS, {}, '/sql');

    const path = '/sql/db.sqlite';
    if (typeof SharedArrayBuffer === 'undefined') {
      let stream = SQL.FS.open(path, 'a+');
      await stream.node.contents.readIfFallback();
      SQL.FS.close(stream);
    }

    this.db = new SQL.Database(path, { filename: true });
    this.db.exec('PRAGMA journal_mode=MEMORY;');

    this.dbEvents.dispatchEvent(new Event('init'));
  }

  useDb<T>(func: (db: any) => T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.db === undefined) {
        this.dbEvents.addEventListener('init', () => {
          try {
            resolve(func(this.db));
          } catch (err) {
            reject(err);
          }
        });
        if (!this.initCalled) {
          this.initializeDb();
        }
      } else {
        resolve(func(this.db));
      }
    });
  }

}
