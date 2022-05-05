import { v4 as uuidv4 } from 'uuid';
import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';
import { EventTarget, Event } from 'event-target-shim';
import { RequestProcessor } from './client';
import {
  ServerRequest,
  ServerResponse,
  WorkerRequest,
  WorkerResponse
} from './types';

export function backgroundServerRequestProcessor(
  worker: Worker,
  requestTimeout: number = 10000
): RequestProcessor<any> {
  const target = new EventTarget();
  const responses: Record<string, ServerResponse<any>> = {};

  worker.addEventListener('message', (event: MessageEvent) => {
    if (!event.data.requestId) {
      return;
    }
    const response = event.data as WorkerResponse<any>;
    responses[response.requestId] = response.response;
    target.dispatchEvent(new Event(response.requestId));
  });

  return (request: ServerRequest) => {
    const requestId = uuidv4();

    return new Promise((resolve, reject) => {
      target.addEventListener(
        requestId,
        (event) => {
          const response = responses[requestId];
          if (response) {
            clearTimeout(timeout);
            delete responses[requestId];
            resolve(response);
          }
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
