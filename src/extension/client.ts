import {
  ExtensionInterface,
  ExtensionMessage,
  ExtensionRequest,
  ExtensionResponse,
  HelloExtensionRequest,
  HelloExtensionResponse,
} from './types';
import { methodMapping } from './utils';

export type RequestProcessor<T extends ExtensionRequest> = (request: T) => Promise<ExtensionResponse<T>>;

// For use in a background page
export function makeRequestProcessor(server: ExtensionInterface): RequestProcessor<any> {
  const methods = methodMapping(server);
  return async (request) => {
    return await methods[request.type as ExtensionMessage](request) as ExtensionResponse<any>;
  };
}

// For use in a web page
export function processExtensionRequest<T extends ExtensionRequest>(
  request: T
): Promise<ExtensionResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export class ExtensionClient implements ExtensionInterface {

  constructor(readonly requestProcessor: RequestProcessor<any>) {}

  async getHello(request: Omit<HelloExtensionRequest, 'type'>): Promise<HelloExtensionResponse> {
    return await this.requestProcessor({
      type: ExtensionMessage.Hello2,
      ...request
    }) as HelloExtensionResponse;
  }

}
