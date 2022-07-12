import initSqlJs from "../../../lib/sql-wasm.js";
import { DataSource } from "typeorm";
import EventTarget from "@ungap/event-target";
import { ServerInterface, RequestHandler } from "../../server";
import { requestHandler } from "../../server/utils";
import { ServerClient } from "../../server/client";
import { Server } from "../../server/service";
import { migrations } from "../../migrations";
import { entities } from "../../models";

export function convertDataURIToBinary(dataURI: string): Uint8Array {
  return Uint8Array.from(atob(dataURI), (char) => char.charCodeAt(0));
}

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
  let dataSource: DataSource | undefined = undefined;
  const target = new EventTarget();
  let initialized = false;
  let initCalled = false;

  async function initialize(override?: Uint8Array) {
    try {
      const SQL = await initSqlJs({ locateFile: (file: any) => file });

      let database: Uint8Array | undefined = undefined;

      dataSource = new DataSource({
        type: "sqljs",
        driver: SQL,
        database: override ?? existingDb,
        entities,
        migrations,
        migrationsRun: true,
      });
      await dataSource.initialize();

      initialized = true;
      target.dispatchEvent(new CustomEvent("init"));
    } catch (error) {
      initCalled = false;
      target.dispatchEvent(new CustomEvent("error", { detail: error }));
    }
  }

  async function importDb(database: Uint8Array): Promise<void> {
    await dataSource?.close();
    dataSource = undefined;
    initialized = false;
    await initialize(database);
  }

  function getServer() {
    const server = new Server(
      dataSource as DataSource,
      importDb,
    );
    const middleware = serializationMiddleware(requestHandler(server));
    return new ServerClient(middleware);
  }

  return () =>
    new Promise((resolve, reject) => {
      if (initialized) {
        resolve(getServer());
        return;
      }
      target.addEventListener(
        "init",
        () => {
          resolve(getServer());
        },
        { once: true }
      );
      target.addEventListener(
        "error",
        (event) => {
          reject((event as CustomEvent).detail);
        },
        { once: true }
      );

      if (!initCalled) {
        initialize();
      }
    });
}
