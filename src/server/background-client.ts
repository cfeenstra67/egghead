import { v4 as uuidv4 } from "uuid";
// import { initBackend } from "absurd-sql/dist/indexeddb-main-thread";
import EventTarget from "@ungap/event-target";
import { DBController } from "./db-controller";
import { Server } from './service';
import { WorkerRequest, WorkerResponse, RequestHandler } from "./types";
import { requestHandler } from "./utils";

export function backgroundServerRequestProcessor(
  worker: Worker,
  requestTimeout = 60000
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

      const workerRequest: WorkerRequest<any> = { requestId, request };
      worker.postMessage(workerRequest);

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

// export function createServerWorker(): Worker {
//   const sqlWorker = new Worker("./server-worker.js");
//   initBackend(sqlWorker);
//   return sqlWorker;
// }

// export function createBackgroundServerRequestProcessor(): RequestHandler {
//   return backgroundServerRequestProcessor(createServerWorker());
// }


// const messageTarget = new EventTarget();

// self.postMessage = (event) => {
//   console.log('here', event);
//   self.dispatchEvent(new MessageEvent('message', { data: event }));
// }

// function makeStartWorkerFromMain(getModule: any) {
//   return (argBuffer: any, resultBuffer: any) => {
//     getModule().then(({ default: BackendWorker }: any) => {
//       let worker = new BackendWorker();
//       console.log("HERE", worker);

//       worker.postMessage({ type: 'init', buffers: [argBuffer, resultBuffer] });

//       worker.addEventListener('message', (msg: MessageEvent) => {
//         self.postMessage(msg.data);
//       });
//     });
//   };
// }

// const spawnEventName = '__absurd:spawn-idb-worker';

// const getModule = () => import('absurd-sql/dist/indexeddb-main-thread-worker-e59fee74');

// const startWorkerFromMain = makeStartWorkerFromMain(getModule);

// self.addEventListener('message', e => {
//   switch (e.data.type) {
//     case spawnEventName:
//       startWorkerFromMain(e.data.argBuffer, e.data.resultBuffer);
//       break;
//   }
// });

export function createBackgroundServerRequestProcessor(): RequestHandler {
  // initBackend(self);
  const controller = new DBController();
  return async (request) => {
    const db = await controller.useDataSource();
    const server = new Server(db);
    return requestHandler(server)(request);
  };
}
