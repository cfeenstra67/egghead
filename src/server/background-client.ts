import { v4 as uuidv4 } from 'uuid';
import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';
import EventTarget from '@ungap/event-target';
import { RequestProcessor } from './client';
import {
  ServerRequest,
  ServerResponse,
  WorkerRequest,
  WorkerResponse
} from './types';

export function backgroundServerRequestProcessor(
  worker: Worker,
  requestTimeout: number = 60000
): RequestProcessor<any> {
  const target = new EventTarget();

  worker.addEventListener('message', (event: MessageEvent) => {
    if (!event.data.requestId) {
      return;
    }
    const response = event.data as WorkerResponse<any>;
    target.dispatchEvent(
      new CustomEvent(response.requestId, { detail: response.response })
    );
  });

  return (request: ServerRequest) => {
    const requestId = uuidv4();

    return new Promise((resolve, reject) => {
      target.addEventListener(
        requestId,
        (event) => {
          clearTimeout(timeout);
          resolve((event as CustomEvent).detail);
        },
        { once: true }
      );

      const workerRequest: WorkerRequest<any> = { requestId, request };
      worker.postMessage(workerRequest);

      const timeout = setTimeout(() => {
        reject(new Error(`Timed out after ${requestTimeout}ms.`));
      }, requestTimeout);
    });
  }
}

export function createServerWorker(): Worker {
  const sqlWorker = new Worker('./server-worker.js');
  initBackend(sqlWorker);
  return sqlWorker
}

export function createBackgroundServerRequestProcessor(): RequestProcessor<any> {
  return backgroundServerRequestProcessor(createServerWorker());
}
