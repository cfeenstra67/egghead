// import initSqlJs from '@jlongster/sql.js';
import initSqlJs from '../../../lib/sql-wasm.js';
import { DataSource } from 'typeorm';
import EventTarget from '@ungap/event-target';
import { processExtensionRequest } from '../../extension/client';
import { ServerInterface } from '../../server';
import { ServerClient } from '../../server/client';
import { Server } from '../../server/service';
import { migrations } from '../../migrations';
import { entities } from '../../models';
import { AppRuntime } from './types';

import existingDb from '../../../history.db';

function convertDataURIToBinary(dataURI: string): Uint8Array {
  return Uint8Array.from(atob(dataURI), (char) => char.charCodeAt(0));
}

function serverFactory(): () => Promise<ServerInterface> {
  let dataSource: DataSource | undefined = undefined;
  const target = new EventTarget();
  let initialized = false;
  let initCalled = false;

  async function initialize() {
    try {
      const SQL = await initSqlJs({ locateFile: (file: any) => file });

      let database: Uint8Array | undefined = undefined;
      if (existingDb !== '') {
        database = convertDataURIToBinary(existingDb);
      }

      dataSource = new DataSource({
        type: 'sqljs',
        driver: SQL,
        database,
        entities,
        migrations,
        migrationsRun: true,
      });
      await dataSource.initialize();

      initialized = true;
      target.dispatchEvent(new CustomEvent('init'));
    } catch (error) {
      initCalled = false;
      target.dispatchEvent(new CustomEvent('error', { detail: error }));
    }
  }

  return () => new Promise((resolve, reject) => {
    if (initialized) {
      resolve(new Server(dataSource as DataSource));
      return;
    }
    target.addEventListener('init', () => {
      resolve(new Server(dataSource as DataSource));
    }, { once: true });
    target.addEventListener('error', (event) => {
      reject((event as CustomEvent).detail);
    }, { once: true });

    if (!initCalled) {
      initialize();
    }
  });
}

async function serverClientFactory(): Promise<ServerInterface> {
  return new ServerClient(processExtensionRequest);
}

export function getServerClientFactory(context: AppRuntime): () => Promise<ServerInterface> {
  switch (context) {
    case AppRuntime.Extension:
      return serverClientFactory;
    case AppRuntime.Web:
      return serverFactory();
  }
}
