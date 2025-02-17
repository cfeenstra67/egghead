import { v4 as uuidv4 } from "uuid";
import { Aborted } from "./abort";
import { ServerMessage, ServerResponseCode } from "./types";
import type { RequestHandler, ServerInterface } from "./types";

// For use in a web page or from background to offscreen communication
export function createExtensionRequestProcessor(
  target: "background" | "offscreen",
): RequestHandler {
  return (request) => {
    const { abort, ...baseRequest } = request;
    const requestId = uuidv4();

    abort?.addEventListener("abort", () => {
      chrome.runtime.sendMessage({ type: "abort", requestId, target });
    });

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { requestId, request: baseRequest, target },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        },
      );
    });
  };
}

export function createServerClient(processor: RequestHandler): ServerInterface {
  const out: any = {};
  for (const method of Object.values(ServerMessage)) {
    out[method] = async (request: any) => {
      const response = await processor({ type: method, ...request });
      if (response.code === ServerResponseCode.Ok) {
        return response;
      }
      if (response.code === ServerResponseCode.Aborted) {
        throw new Aborted();
      }
      throw new ServerError(response.message, response.stack);
    };
  }

  return out as ServerInterface;
}

export class ServerError extends Error {
  constructor(message: string, stack?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    if (stack !== undefined) {
      this.stack = stack;
    }
  }
}
