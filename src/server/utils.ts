import { v4 as uuidv4 } from "uuid";
import parentLogger from "../logger";
import type { SettingsItems } from "../models";
import { Aborted } from "./abort";
import { BinaryOperator, clausesEqual } from "./clause";
import type { JobManager, JobManagerMiddleware } from "./job-manager";
import { ServerMessage, ServerResponseCode, Theme } from "./types";
import type {
  DeleteSessionsRequest,
  DeleteSessionsResponse,
  ErrorResponse,
  QuerySessionsRequest,
  RequestHandler,
  ServerInterface,
  TypedServerRequestForMessage,
  WorkerHandler,
} from "./types";

const logger = parentLogger.child({ context: "server-utils" });

export function cleanURL(uri: string): string {
  const urlObj = new URL(uri);
  urlObj.search = "";
  urlObj.hash = "";
  return urlObj.href;
}

export function getHost(uri: string): string {
  const urlObj = new URL(uri);
  return urlObj.hostname;
}

export function requestHandler(server: ServerInterface): RequestHandler {
  return async <T extends ServerMessage>(
    input: TypedServerRequestForMessage<T>,
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
      let stack: string | undefined = undefined;
      if (err === null || err === undefined) {
        message = "";
      } else {
        message = err.toString();
        stack = err.stack;
      }
      const response: ErrorResponse = {
        code: ServerResponseCode.Error,
        message,
        stack,
      };
      return response as any;
    }
  };
}

export function requestsEqual(
  req1: QuerySessionsRequest,
  req2: QuerySessionsRequest,
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
  dateString = dateString.replace(" ", "T");
  if (!dateString.endsWith("Z")) {
    dateString += "Z";
  }
  return new Date(dateString);
}

export function dateToSqliteString(date: Date): string {
  return date.toISOString();
}

export function defaultSettings(): SettingsItems {
  return {
    dataCollectionEnabled: true,
    devModeEnabled: DEV_MODE,
    theme: Theme.Auto,
    retentionPolicyMonths: 12,
  };
}

export function jobManagerMiddleware(
  handler: RequestHandler,
  jobManager: JobManager,
): RequestHandler {
  return async (request) => {
    // Let pings through immediately
    if (request.type === ServerMessage.Ping) {
      return await handler(request);
    }
    const requestId = uuidv4();
    jobManager.addJob(requestId, (abort) => {
      return handler({ ...request, abort });
    });
    request.abort?.addEventListener("abort", () =>
      jobManager.abortJob(requestId),
    );
    return await jobManager.jobPromise(requestId);
  };
}

export const logJobMiddleware: JobManagerMiddleware = (job, ctx) => {
  return async (abort) => {
    const before = new Date();
    try {
      return await job(abort);
    } finally {
      const after = new Date();
      logger.debug(
        "%s job completed after %sms (waited for %sms)",
        ctx.jobId,
        after.getTime() - before.getTime(),
        before.getTime() - ctx.addTime.getTime(),
      );
    }
  };
};

export function jobLockingMiddleware(lockName: string): JobManagerMiddleware {
  return (job, ctx) => (abort) => {
    const before = new Date();
    return navigator.locks
      .request(lockName, { signal: abort }, () => {
        const after = new Date();
        logger.debug(
          "%s lock (%s) acquired after %s",
          ctx.jobId,
          lockName,
          after.getTime() - before.getTime(),
        );
        return job(abort);
      })
      .catch((error: any) => {
        if (error.toString().includes("The request was aborted")) {
          throw new Aborted();
        }
        throw error;
      });
  };
}

export function logRequestMiddleware(handler: RequestHandler): RequestHandler {
  return async (request) => {
    const before = new Date();
    try {
      return await handler(request);
    } finally {
      const after = new Date();
      logger.debug(
        "%s request completed after %sms",
        request.type,
        after.getTime() - before.getTime(),
      );
    }
  };
}

export function workerRequestHandler(handler: WorkerHandler): RequestHandler {
  return async (request) => {
    const requestId = uuidv4();
    const { abort, ...args } = request;
    const response = await handler({
      requestId,
      type: "request",
      request: args,
    });
    if (abort) {
      abort.addEventListener("abort", async () => {
        await handler({ requestId, type: "abort" });
      });
    }
    return response.response as any;
  };
}

export async function* iterateSessions(
  service: ServerInterface,
  request: Omit<QuerySessionsRequest, "skip" | "limit"> & {
    chunkSize?: number;
  },
) {
  let { chunkSize, ...args } = request;
  chunkSize ??= 1000;
  const resp = await service.querySessions({
    ...args,
    limit: chunkSize,
  });

  for (const session of resp.results) {
    yield session;
  }

  const pages = Math.ceil(resp.totalCount / chunkSize);
  let page = 1;
  while (page < pages) {
    const resp = await service.querySessions({
      ...args,
      skip: chunkSize * page,
      limit: chunkSize,
    });

    for (const session of resp.results) {
      yield session;
    }

    page++;
  }
}

export async function deleteSessions(
  service: ServerInterface,
  { deleteCorrespondingChromeHistory, ...request }: DeleteSessionsRequest,
): Promise<DeleteSessionsResponse> {
  if (!deleteCorrespondingChromeHistory) {
    return await service.deleteSessions(request);
  }

  let ids: string[] = [];
  let urls = new Set<string>();
  const deletedSessionIds: string[] = [];

  const deleteIds = async () => {
    if (ids.length === 0) {
      return;
    }
    await Promise.all(
      Array.from(urls).map((url) => chrome.history.deleteUrl({ url })),
    );
    const { deletedSessionIds: outIds } = await service.deleteSessions({
      filter: {
        operator: BinaryOperator.In,
        fieldName: "id",
        value: ids,
      },
    });
    deletedSessionIds.push(...outIds);
    ids = [];
    urls = new Set();
  };

  for await (const session of iterateSessions(service, request)) {
    ids.push(session.id);
    urls.add(session.url);
    urls.add(session.rawUrl);
    if (ids.length > 100) {
      await deleteIds();
    }
  }

  await deleteIds();

  return { deletedSessionIds };
}
