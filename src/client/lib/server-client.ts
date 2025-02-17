import type { ImportDatabaseResponse, ServerInterface } from "../../server";
import { createServerClient } from "../../server/client";
import { workerRequestHandler } from "../../server/utils";
import { createWorkerClient } from "../../server/worker-client";

export function serverFactory(
  existingDb: Uint8Array,
): () => Promise<ServerInterface> {
  const worker = new Worker("offscreen-worker.js");
  const workerHandler = createWorkerClient(worker);
  const handler = workerRequestHandler(workerHandler);
  const client = createServerClient(handler);

  let importPromise: Promise<ImportDatabaseResponse> | null = null;

  return async () => {
    if (importPromise === null) {
      const url = URL.createObjectURL(new Blob([existingDb]));
      importPromise = client.importDatabase({ databaseUrl: url });
    }
    await importPromise;

    return client;
  };
}
