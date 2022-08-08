import { Server } from "./service";
import { RequestHandler } from "./types";
import { requestHandler } from "./utils";
import { WaSqliteDBController } from "./wa-sqlite-db-controller";

export interface BackgroundClient {
  handle: RequestHandler;
  close: () => Promise<void>;
}

export function createBackgroundClient(): BackgroundClient {
  const dbController = new WaSqliteDBController();

  const handle: RequestHandler = async (request) => {
    const db = await dbController.useDataSource();
    const server = new Server(db, dbController.importDb.bind(dbController));
    const handler = requestHandler(server);
    return await handler(request);
  };

  const close = async () => {
    await dbController.teardownDb();
  }

  return { handle, close };
}
