import { v4 as uuidv4 } from "uuid";
import { clausesEqual } from "./clause";
import { JobManager } from "./job-manager";
import type { SettingsItems } from "../models";
import {
  Theme,
  ServerMessage,
  ServerResponseCode,
} from "./types";
import type {
  ErrorResponse,
  TypedServerRequestForMessage,
  ServerInterface,
  RequestHandler,
  QuerySessionsRequest,
} from "./types";

export function cleanURL(uri: string): string {
  const urlObj = new URL(uri);
  urlObj.search = "";
  urlObj.hash = "";
  return urlObj.href;
}

export function getHost(uri: string): string {
  const urlObj = new URL(uri);
  const hostname = urlObj.hostname;
  // For www domains, use the root host
  if (hostname.startsWith("www.")) {
    return hostname.slice(4);
  }
  return hostname;
}

export function requestHandler(server: ServerInterface): RequestHandler {
  return async <T extends ServerMessage>(
    input: TypedServerRequestForMessage<T>
  ) => {
    const method = server[input.type]?.bind(server);
    if (method === undefined) {
      return {
        code: ServerResponseCode.Error,
        message: `Invalid method ${input.type}.`,
      };
    }
    try {
      const response = await method(input as any);
      return { code: ServerResponseCode.Ok, ...response };
    } catch (err: any) {
      let message: string;
      if (err === null && err === undefined) {
        message = "";
      } else if (err.stack !== undefined) {
        message = err.stack;
      } else {
        message = err.toString();
      }
      const response: ErrorResponse = {
        code: ServerResponseCode.Error,
        message,
      };
      return response as any;
    }
  };
}

export function requestsEqual(
  req1: QuerySessionsRequest,
  req2: QuerySessionsRequest
): boolean {
  let filterEqual = true;
  if (req1.filter && req2.filter) {
    filterEqual = clausesEqual(req1.filter, req2.filter);
  } else if (req1.filter || req2.filter) {
    filterEqual = false;
  }

  return (
    req1.query === req2.query &&
    req1.skip === req2.skip &&
    req1.limit === req2.limit &&
    filterEqual
  );
}

export function dateFromSqliteString(dateString: string): Date {
  return new Date(dateString.replace(" ", "T") + "Z");
}

export function dateToSqliteString(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

export function defaultSettings(): SettingsItems {
  return {
    dataCollectionEnabled: true,
    devModeEnabled: false,
    theme: Theme.Auto,
  };
}

export function jobManagerMiddleware(
  handler: RequestHandler,
  jobManager: JobManager,
): RequestHandler {
  return async (request) => {
    const requestId = uuidv4();
    jobManager.addJob(requestId, async (abort) => {
      return await handler({ ...request, abort });
    });
    request.abort?.addEventListener('abort', () => jobManager.abortJob(requestId));
    return await jobManager.jobPromise(requestId);
  };
}
