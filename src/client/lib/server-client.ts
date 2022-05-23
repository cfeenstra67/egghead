import initSqlJs from '../../../lib/sql-wasm.js';
import { DataSource } from 'typeorm';
import EventTarget from '@ungap/event-target';
import {
  ServerInterface,
  RequestHandler,
} from '../../server';
import { requestHandler } from '../../server/utils';
import { ServerClient } from '../../server/client';
import { Server } from '../../server/service';
import { migrations } from '../../migrations';
import { entities } from '../../models';
import { AppRuntime } from './types';

function convertDataURIToBinary(dataURI: string): Uint8Array {
  return Uint8Array.from(atob(dataURI), (char) => char.charCodeAt(0));
}

function serializationMiddleware(handler: RequestHandler): RequestHandler {

  const handleRequest: RequestHandler = async (request) => {
    const result = await handler(request as any);
    return JSON.parse(JSON.stringify(result));
  };

  return handleRequest;
}

export function serverFactory(existingDb: string): () => Promise<ServerInterface> {
  let dataSource: DataSource | undefined = undefined;
  const target = new EventTarget();
  let initialized = false;
  let initCalled = false;

  async function initialize() {
    try {
      const SQL = await initSqlJs({ locateFile: (file: any) => file });

      let database: Uint8Array | undefined = undefined;
      database = convertDataURIToBinary(existingDb);

      dataSource = new DataSource({
        type: 'sqljs',
        driver: SQL,
        database,
        entities,
        migrations,
        migrationsRun: true,
        // logging: ['query'],
      });
      await dataSource.initialize();

      initialized = true;
      target.dispatchEvent(new CustomEvent('init'));
    } catch (error) {
      initCalled = false;
      target.dispatchEvent(new CustomEvent('error', { detail: error }));
    }
  }

  function getServer() {
    const server = new Server(dataSource as DataSource);
    const middleware = serializationMiddleware(requestHandler(server));
    return new ServerClient(middleware);
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