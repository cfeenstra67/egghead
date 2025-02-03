import { ServerInterface } from "../../server";
import { workerRequestHandler } from "../../server/utils";
import { ServerClient } from "../../server/client";
import { createWorkerClient } from "../../server/worker-client";

export function serverFactory(
  existingDb: Uint8Array
): () => Promise<ServerInterface> {
  const worker = new Worker('offscreen-worker.js');

  return async () => {
    const workerHandler = createWorkerClient(worker);
    const handler = workerRequestHandler(workerHandler);
  
    const client = new ServerClient(handler);

    const url = URL.createObjectURL(new Blob([existingDb]));
    await client.importDatabase({ databaseUrl: url });

    return client;
  };
}
