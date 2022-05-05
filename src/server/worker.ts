import { DataSource } from 'typeorm';
import { DBController } from './db-controller';
import { Server } from './service';
import {
  ServerRequest,
  ServerResponseCode,
  ErrorResponse,
  WorkerRequest,
  WorkerResponse,
} from './types';
import { methodMapping } from './utils';

const dbController = new DBController();

async function processMessage<T extends ServerRequest>(
  { requestId, request }: WorkerRequest<T>,
  dataSource: DataSource
): Promise<WorkerResponse<T>> {
  const server = new Server(dataSource);
  const methods = methodMapping(server);
  const method = methods[request.type];
  if (method === undefined) {
    const response: ErrorResponse = {
      code: ServerResponseCode.Error,
      message: `No method exists for ${request.type}.`
    }
    return { requestId, response };
  }
  const response = await method(request as any);
  return { requestId, response } as any; // TODO: why doesn't ts like this?
}

function handleMessage(event: MessageEvent) {
  const request = event.data as WorkerRequest<any>;
  dbController.useDb(async (dataSource) => {
    const response = await processMessage(request, dataSource);
    self.postMessage(response);
  }).catch((err) => {
    console.trace('Error handling server message.', err);
    let message: string;
    if (err === null && err === undefined) {
      message = ''
    } else if (err.stack !== undefined) {
      message = err.stack;
    } else {
      message = err.toString();
    }
    const response: ErrorResponse = {
      code: ServerResponseCode.Error,
      message,
    }
    self.postMessage({ requestId: request.requestId, response });
  });
}

self.onmessage = handleMessage;
