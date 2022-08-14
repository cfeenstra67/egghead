import { ServerInterface, RequestHandler } from "../../server";
import { requestHandler, jobManagerMiddleware } from "../../server/utils";
import { ServerClient } from "../../server/client";
import { SqlJsDBController } from "./sql-js-db-controller";
import { JobManager } from "../../server/job-manager";
import { Server } from "../../server/service";

function serializationMiddleware(handler: RequestHandler): RequestHandler {
  const handleRequest: RequestHandler = async (request) => {
    const { abort, ...bareRequest } = request;
    const serializedRequest = JSON.parse(JSON.stringify(bareRequest));
    const result = await handler({ ...serializedRequest, abort });
    return JSON.parse(JSON.stringify(result));
  };

  return handleRequest;
}

export function serverFactory(
  existingDb: Uint8Array
): () => Promise<ServerInterface> {
  const dbController = new SqlJsDBController(existingDb);
  const jobManager = new JobManager();

  return async () => {
    const dataSource = await dbController.useDataSource();
    const server = new Server(dataSource, dbController.importDb.bind(dbController));
    let handler = jobManagerMiddleware(requestHandler(server), jobManager);
    handler = serializationMiddleware(handler);
    return new ServerClient(handler);
  };
}
