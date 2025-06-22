import type { AbstractDBController } from "./abstract-db-controller.js";
import { Server } from "./service.js";
import type { RequestHandler } from "./types.js";
import { requestHandler } from "./utils.js";

export interface BackgroundClient {
  handle: RequestHandler;
  close: () => Promise<void>;
}

export function createBackgroundClient(
  dbController: AbstractDBController,
): BackgroundClient {
  const handle: RequestHandler = async (request) => {
    const db = await dbController.useConnection();
    const server = new Server(db, () => dbController.reset());
    const handler = requestHandler(server);
    return await handler(request);
  };

  const close = async () => {
    await dbController.teardownDb();
  };

  return { handle, close };
}
