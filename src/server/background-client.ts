import { v4 as uuidv4 } from "uuid";
import { initBackend } from "absurd-sql/dist/indexeddb-main-thread";
import EventTarget from "@ungap/event-target";
import { WorkerRequest, WorkerAbortRequest, WorkerResponse, RequestHandler } from "./types";

export function backgroundServerRequestProcessor(
  worker: Worker,
  requestTimeout: number = 60 * 1000
): RequestHandler {
  const target = new EventTarget();

  worker.addEventListener("message", (event: MessageEvent) => {
    if (!event.data.requestId) {
      return;
    }
    const response = event.data as WorkerResponse<any>;
    target.dispatchEvent(
      new CustomEvent(response.requestId, { detail: response.response })
    );
  });

  return (request) => {
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

      const { abort, ...bareRequest } = request;
      const workerRequest: WorkerRequest<any> = { type: 'request', requestId, request: bareRequest };
      worker.postMessage(workerRequest);

      abort?.addEventListener('abort', () => {
        const abortRequest: WorkerAbortRequest = { type: 'abort', requestId };
        worker.postMessage(abortRequest);
      });

      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Request ${JSON.stringify(
              request
            )} timed out after ${requestTimeout}ms.`
          )
        );
      }, requestTimeout);
    });
  };
}

export function createServerWorker(): Worker {
  const sqlWorker = new Worker("./server-worker.js");
  initBackend(sqlWorker);
  return sqlWorker;
}

export function createBackgroundServerRequestProcessor(): RequestHandler {
  return backgroundServerRequestProcessor(createServerWorker());
}
