import { AbstractDBController } from "./abstract-db-controller";
import { Server } from "./service";
import { RequestHandler } from "./types";
import { requestHandler } from "./utils";

export interface BackgroundClient {
  handle: RequestHandler;
  close: () => Promise<void>;
}

export function createBackgroundClient(
  dbController: AbstractDBController
): BackgroundClient {
  const handle: RequestHandler = async (request) => {
    const db = await dbController.useConnection();
    const server = new Server(db, () => dbController.reset());
    const handler = requestHandler(server);
    return await handler(request);
  };

  const close = async () => {
    await dbController.teardownDb();
  }

  return { handle, close };
}
