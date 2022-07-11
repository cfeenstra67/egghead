import { Aborted } from "./abort";
import { DBController } from "./db-controller";
import { JobManager } from "./job-manager";
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
const jobManager = new JobManager(requestTimeout);

const handleRequest: RequestHandler = async (request) => {
  const dataSource = await dbController.useDataSource();
  const server = new Server(dataSource, dbController.importDb.bind(dbController));
  const handler = requestHandler(server);
  const out = await handler(request);
  return out;
};

function handleMessage(event: MessageEvent) {
  const request = event.data as WorkerMessage;
  if (request.type === 'abort') {
    jobManager.abortJob(request.requestId);
  } else {
    const job = (abort: AbortSignal) => handleRequest({
      ...(request.request as any),
      abort,
    });
    jobManager.addJob(request.requestId, job);
  }
}

self.onmessage = handleMessage;

jobManager.on("success", (result, job) => {
  self.postMessage({ requestId: job.id, response: result });
});

jobManager.on("error", (err, job) => {
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

jobManager.on("timeout", (_, job) => {
  const response: ErrorResponse = {
    code: ServerResponseCode.Error,
    message: `Backend timed out after ${requestTimeout}ms.`,
  };
  self.postMessage({ requestId: job.id, response });
});
