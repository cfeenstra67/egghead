import * as SQLite from 'wa-sqlite';
import { DataSource } from "typeorm";
import { IDBVersionedVFS } from 'wa-sqlite/src/examples/IDBVersionedVFS';
import { AbstractDBController } from './abstract-db-controller';
import { migrations } from "../migrations";
import { entities } from "../models";

export class WaSqliteDBController extends AbstractDBController {

  protected async createDataSource(): Promise<DataSource> {
    const { default: moduleFactory } = await import('wa-sqlite/dist/wa-sqlite-async.mjs');
    const module = await moduleFactory();

    const sqlite3 = SQLite.Factory(module);
    const vfsName = 'idb-versioned';
    const dbName = 'history';
    const vfs = new IDBVersionedVFS(vfsName);

    sqlite3.vfs_register(vfs);

    const dataSource = new DataSource({
      type: "wa-sqlite",
      driver: sqlite3,
      database: dbName,
      vfs: vfsName,
      migrations,
      entities,
    });

    await dataSource.initialize();
    await dataSource.query('PRAGMA page_size=8192');
    await dataSource.runMigrations();

    return dataSource;
  }

  async importDb(database: Uint8Array): Promise<void> {
    throw new Error('not implemented');
  }
}
