import queue from "queue";
import { DBController } from "./db-controller";
import { Server } from "./service";
import {
  ServerResponseCode,
  ErrorResponse,
  WorkerRequest,
  RequestHandler,
} from "./types";
import { requestHandler } from "./utils";

const dbController = new DBController();

const requestTimeout = 10000;

const requestQueue = queue({
  concurrency: 1,
  timeout: requestTimeout,
});

const handleRequest: RequestHandler = async (request) => {
  const dataSource = await dbController.useDataSource();
  const server = new Server(dataSource, dbController.importDb.bind(dbController));
  const handler = requestHandler(server);
  return await handler(request);
};

function handleMessage(event: MessageEvent) {
  const request = event.data as WorkerRequest<any>;
  const job = () => handleRequest(request.request);
  job.id = request.requestId;
  requestQueue.push(job);
  requestQueue.start();
}

self.onmessage = handleMessage;

requestQueue.on("success", (result, job) => {
  self.postMessage({ requestId: job.id, response: result });
});

requestQueue.on("error", (err, job) => {
  console.trace("Error handling server message.", err);
  let message: string;
  if (err === null && err === undefined) {
    message = "";
  } else if (err.stack !== undefined) {
    message = err.stack;
  } else {
    message = err.toString();
  }
  const response: ErrorResponse = {
    code: ServerResponseCode.Error,
    message,
  };
  self.postMessage({ requestId: job.id, response });
});

requestQueue.on("timeout", (_, job) => {
  const response: ErrorResponse = {
    code: ServerResponseCode.Error,
    message: `Backend timed out after ${requestTimeout}ms.`,
  };
  self.postMessage({ requestId: job.id, response });
});
