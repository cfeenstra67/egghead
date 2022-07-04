import queue from "queue";
import { Aborted } from "./abort";
import { DBController } from "./db-controller";
import { Server } from "./service";
import {
  ServerResponseCode,
  ErrorResponse,
  WorkerMessage,
  RequestHandler,
} from "./types";
import { requestHandler } from "./utils";

const dbController = new DBController();

const requestTimeout = 10000;

const requestQueue = queue({
  concurrency: 1,
  timeout: requestTimeout,
});

const aborts: Record<string, AbortController> = {};

const handleRequest: RequestHandler = async (request) => {
  if (request.abort?.aborted) {
    throw new Aborted();
  }
  const dataSource = await dbController.useDataSource();
  const server = new Server(dataSource, dbController.importDb.bind(dbController));
  const handler = requestHandler(server);
  return await handler(request);
};

function handleMessage(event: MessageEvent) {
  const request = event.data as WorkerMessage;
  if (request.type === 'abort') {
    aborts[request.requestId]?.abort();
  } else {
    const abortController = new AbortController();
    const job = () => handleRequest({
      ...(request.request as any),
      abort: abortController.signal
    });
    job.id = request.requestId;
    requestQueue.push(job);
    aborts[request.requestId] = abortController;
    requestQueue.start();
  }
}

self.onmessage = handleMessage;

requestQueue.on("success", (result, job) => {
  if (aborts[job.id]) {
    delete aborts[job.id];
  }
  self.postMessage({ requestId: job.id, response: result });
});

requestQueue.on("error", (err, job) => {
  if (aborts[job.id]) {
    delete aborts[job.id];
  }
  console.trace("Error handling server message.", err);
  let message: string;
  if (err === null && err === undefined) {
    message = "";
  } else if (err.stack !== undefined) {
    message = err.stack;
  } else {
    message = err.toString();
  }
  const isAborted = err instanceof Aborted;
  const response: ErrorResponse = {
    code: isAborted ? ServerResponseCode.Aborted : ServerResponseCode.Error,
    message,
  };
  self.postMessage({ requestId: job.id, response });
});

requestQueue.on("timeout", (_, job) => {
  if (aborts[job.id]) {
    delete aborts[job.id];
  }
  const response: ErrorResponse = {
    code: ServerResponseCode.Error,
    message: `Backend timed out after ${requestTimeout}ms.`,
  };
  self.postMessage({ requestId: job.id, response });
});
