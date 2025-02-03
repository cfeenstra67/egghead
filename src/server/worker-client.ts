import { ServerMessage, WorkerHandler, WorkerResponse } from "./types";

export function createWorkerClient(worker: Worker): WorkerHandler {
  return (request) => {
    return new Promise<WorkerResponse<ServerMessage>>((resolve, reject) => {
      const handleMessage = (message: MessageEvent<WorkerResponse<ServerMessage>>) => {
        if (message.data.requestId !== request.requestId) {
          return;
        }
        cleanup();
        resolve(message.data);
      };

      const handleError = (error: ErrorEvent) => {
        console.error('ERROR', error);
      };

      const cleanup = ()  => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      worker.postMessage(request);
    });
  };
}
