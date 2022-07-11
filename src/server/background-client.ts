import { v4 as uuidv4 } from "uuid";
import { initBackend } from "absurd-sql/dist/indexeddb-main-thread";
import EventTarget from "@ungap/event-target";
import { JobManager } from "./job-manager";
import { WorkerRequest, WorkerResponse, RequestHandler } from "./types";

const requestTimeout = 60 * 1000;
const jobManager = new JobManager(requestTimeout);

export function backgroundServerRequestProcessor(
  worker: Worker
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
    
    const { abort, ...bareRequest } = request;

    abort?.addEventListener('abort', () => jobManager.abortJob(requestId));

    const job = (abortJob: AbortSignal) => new Promise((resolve, reject) => {
      target.addEventListener(
        requestId,
        (event) => resolve((event as CustomEvent).detail),
        { once: true }
      );

      const abortJobListener = () => {
        worker.postMessage({ type: 'abort', requestId });
        abortJob.removeEventListener("abort", abortJobListener);
      }
      abortJob.addEventListener('abort', abortJobListener);

      const workerRequest: WorkerRequest<any> = { type: 'request', requestId, request: bareRequest };
      worker.postMessage(workerRequest);
    });

    jobManager.addJob(requestId, job)

    return jobManager.jobPromise(requestId);
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
