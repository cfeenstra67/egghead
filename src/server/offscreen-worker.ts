import { Aborted } from './abort';
import { createBackgroundClient } from './background-client';
import { JobManager } from './job-manager';
import { SQLiteWASMDBController } from './sqlite-wasm-db-controller';
import { ServerResponseCode, WorkerMessage } from './types';

const { handle: serverConnection, close: closeServer } = createBackgroundClient(new SQLiteWASMDBController('history.db'));

const jobManager = new JobManager();

self.onmessage = (message) => {
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
    postMessage({ requestId, response });
  }).catch((error) => {
    postMessage({ requestId, response: { code: error instanceof Aborted ? ServerResponseCode.Aborted : ServerResponseCode.Error, message: error.message, stack: error.stack } });
  });
};

self.onclose = () => {
  closeServer();
};
