import { Aborted } from './abort';
import { createBackgroundClient } from './background-client';
import { JobManager } from './job-manager';
import { SQLiteWASMDBController } from './sqlite-wasm-db-controller';
import { ServerResponseCode, WorkerMessage } from './types';

const { handle: serverConnection, close: closeServer } = createBackgroundClient(new SQLiteWASMDBController('/test.db'));

const jobManager = new JobManager();

console.log('WORKER STARTING');

self.onmessage = (message) => {
  console.log('WORKER RECEIVED MESSAGE');

  const data = message.data as WorkerMessage;

  if (data.type === 'abort') {
    jobManager.abortJob(data.requestId);

    return;
  }

  const { requestId, request } = data;

  jobManager.addJob(requestId, (abort) => {
    return serverConnection({ ...request, abort } as any);
  });

  jobManager.jobPromise(requestId).then((response) => {
    console.log('WORKER RESPONSE', response);

    postMessage({ requestId, response: { ...response, code: ServerResponseCode.Ok } });
  }).catch((error) => {
    console.log('WORKER ERROR', error);

    postMessage({ requestId, response: { code: error instanceof Aborted ? ServerResponseCode.Aborted : ServerResponseCode.Error, message: error.message, stack: error.stack } });
  });
};

self.onclose = () => {
  closeServer();
};
