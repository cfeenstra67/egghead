import * as SQLite from 'wa-sqlite';
import { DataSource } from "typeorm";
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS';
import { AbstractDBController } from './abstract-db-controller';
import { migrations } from "../migrations";
import { entities } from "../models";

export class WaSqliteDBController extends AbstractDBController {

  protected async createDataSource(): Promise<DataSource> {
    const { default: moduleFactory } = await import('wa-sqlite/dist/wa-sqlite-async.mjs');
    const module = await moduleFactory();

    const sqlite3 = SQLite.Factory(module);
    const vfsName = 'idb-batch-atomic';
    const dbName = 'history';
    const vfs = new IDBBatchAtomicVFS(vfsName);

    sqlite3.vfs_register(vfs);

    const dataSource = new DataSource({
      type: "wa-sqlite",
      driver: sqlite3,
      database: dbName,
      vfs: vfsName,
      migrations,
      migrationsRun: true,
      entities,
    });

    await dataSource.initialize();
    return dataSource;
  }

  async importDb(database: Uint8Array): Promise<void> {
    throw new Error('not implemented');
  }
}
